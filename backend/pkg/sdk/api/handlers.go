package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	httpCfg "openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
)

type handlersImpl struct {
	cfg       *httpCfg.Config
	log       logger.Logger
	responser api.Responser
	producer  types.Producer
	sessions  sessions.Sessions
	projects  projects.Projects
	geoIP     geoip.GeoParser
	tokenizer *token.Tokenizer
	flaker    *flakeid.Flaker
}

func NewHandlers(cfg *httpCfg.Config, log logger.Logger, responser api.Responser, producer types.Producer,
	projects projects.Projects, sessions sessions.Sessions, geoIP geoip.GeoParser, tokenizer *token.Tokenizer,
	flaker *flakeid.Flaker) (api.Handlers, error) {
	return &handlersImpl{
		cfg:       cfg,
		log:       log,
		responser: responser,
		producer:  producer,
		projects:  projects,
		sessions:  sessions,
		geoIP:     geoIP,
		tokenizer: tokenizer,
		flaker:    flaker,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/sdk/start", "POST", e.startSession, api.NoPermissions, api.DoNotTrack},
		{"/v1/sdk/i", "POST", e.ingestData, api.NoPermissions, api.DoNotTrack},
	}
}

type StartSDKSessionRequest struct {
	ProjectKey      string `json:"projectKey"`
	OS              string `json:"os"`
	OSVersion       string `json:"os_version"`
	Browser         string `json:"browser"`
	BrowserVersion  string `json:"browser_version"`
	Platform        string `json:"platform"`
	ScreenHeight    int    `json:"screen_height"`
	ScreenWidth     int    `json:"screen_width"`
	InitialReferrer string `json:"initial_referrer"`
	UTMSource       string `json:"utm_source"`
	UTMMedium       string `json:"utm_medium"`
	UTMCampaign     string `json:"utm_campaign"`
	UserID          string `json:"user_id"`
	DeviceID        string `json:"device_id"`
	SDKEdition      string `json:"sdk_edition"`
	SDKVersion      string `json:"sdk_version"`
	Timezone        string `json:"timezone"`
	SearchEngine    string `json:"search_engine"`
}

func (e *handlersImpl) startSession(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	if r.Body == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadCompressedBody(e.log, w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &StartSDKSessionRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	p, err := e.projects.GetProjectByKey(req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			logErr := fmt.Errorf("project doesn't exist or is not active, key: %s", req.ProjectKey)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, logErr, startTime, r.URL.Path, bodySize)
		} else {
			e.log.Error(r.Context(), "failed to get project by key: %s, err: %s", req.ProjectKey, err)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("can't find a project"), startTime, r.URL.Path, bodySize)
		}
		return
	}

	geoInfo := e.geoIP.ExtractGeoData(r)
	startTimeMili := startTime.UnixMilli()
	sessionID, err := e.flaker.Compose(uint64(startTimeMili))
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	tokenData := &token.TokenData{
		ID:      sessionID,
		ExpTime: time.Now().Add(time.Hour * 24).UnixMilli(),
	}

	if err = e.sessions.Add(&sessions.Session{
		SessionID:          sessionID,
		ProjectID:          p.ProjectID,
		UserCountry:        geoInfo.Country,
		UserState:          geoInfo.State,
		UserCity:           geoInfo.City,
		Platform:           req.Platform,
		UserOS:             req.OS,
		UserOSVersion:      req.OSVersion,
		UserBrowser:        req.Browser,
		UserBrowserVersion: req.BrowserVersion,
		ScreenHeight:       req.ScreenHeight,
		ScreenWidth:        req.ScreenWidth,
		Referrer:           &req.InitialReferrer,
		UtmSource:          &req.UTMSource,
		UtmMedium:          &req.UTMMedium,
		UtmCampaign:        &req.UTMCampaign,
		UserID:             &req.UserID, // in case if userID has been saved before
		UserUUID:           req.DeviceID,
		TrackerVersion:     req.SDKVersion,
		Timezone:           req.Timezone,
	}); err != nil {
		e.log.Error(r.Context(), "failed to add new session session: %s, err: %s", sessionID, err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("can't save a session info"), startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"token": e.tokenizer.Compose(*tokenData)}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) ingestData(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	if r.Body == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}
	bodyBytes, err := api.ReadCompressedBody(e.log, w, r, e.cfg.BeaconSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	if err = e.producer.Produce(e.cfg.TopicRawAnalytics, sessionData.ID, bodyBytes); err != nil {
		e.log.Error(r.Context(), "can't send messages batch to queue: %s", err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("can't save message, try again"), startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}
