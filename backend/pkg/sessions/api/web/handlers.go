package web

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Masterminds/semver"

	httpCfg "openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/internal/http/uuid"
	"openreplay/backend/pkg/conditions"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	beacons "openreplay/backend/pkg/sessions/api"
	"openreplay/backend/pkg/token"
)

type handlersImpl struct {
	log             logger.Logger
	cfg             *httpCfg.Config
	responser       *api.Responser
	producer        types.Producer
	projects        projects.Projects
	sessions        sessions.Sessions
	uaParser        *uaparser.UAParser
	geoIP           geoip.GeoParser
	tokenizer       *token.Tokenizer
	conditions      conditions.Conditions
	flaker          *flakeid.Flaker
	beaconSizeCache *beacons.BeaconCache
	features        map[string]bool
}

func NewHandlers(cfg *httpCfg.Config, log logger.Logger, responser *api.Responser, producer types.Producer, projects projects.Projects,
	sessions sessions.Sessions, uaParser *uaparser.UAParser, geoIP geoip.GeoParser, tokenizer *token.Tokenizer,
	conditions conditions.Conditions, flaker *flakeid.Flaker) (api.Handlers, error) {
	return &handlersImpl{
		log:             log,
		cfg:             cfg,
		responser:       responser,
		producer:        producer,
		projects:        projects,
		sessions:        sessions,
		uaParser:        uaParser,
		geoIP:           geoIP,
		tokenizer:       tokenizer,
		conditions:      conditions,
		flaker:          flaker,
		beaconSizeCache: beacons.NewBeaconCache(cfg.BeaconSizeLimit),
		features: map[string]bool{
			"feature-flags":  cfg.IsFeatureFlagEnabled,
			"usability-test": cfg.IsUsabilityTestEnabled,
		},
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/start", e.startSessionHandlerWeb, "POST"},
		{"/v1/web/i", e.pushMessagesHandlerWeb, "POST"},
		{"/v1/web/images", e.imagesUploaderHandlerWeb, "POST"},
	}
}

func getSessionTimestamp(req *StartSessionRequest, startTimeMili int64) uint64 {
	if req.IsOffline {
		return uint64(req.Timestamp)
	}
	ts := uint64(startTimeMili)
	if req.BufferDiff > 0 && req.BufferDiff < 5*60*1000 {
		ts -= req.BufferDiff
	}
	return ts
}

func validateTrackerVersion(ver string) error {
	c, err := semver.NewConstraint(">=6.0.0")
	if err != nil {
		return err
	}
	parts := strings.Split(ver, "-")
	if len(parts) > 1 {
		ver = parts[0]
	}
	v, err := semver.NewVersion(ver)
	if err != nil {
		return err
	}
	if !c.Check(v) {
		return errors.New("unsupported tracker version")
	}
	return nil
}

func (e *handlersImpl) startSessionHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check request body
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

	// Parse request body
	req := &StartSessionRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Add tracker version to context
	r = r.WithContext(context.WithValue(r.Context(), "tracker", req.TrackerVersion))
	if err := validateTrackerVersion(req.TrackerVersion); err != nil {
		e.log.Error(r.Context(), "unsupported tracker version: %s, err: %s", req.TrackerVersion, err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUpgradeRequired, errors.New("please upgrade the tracker version"), startTime, r.URL.Path, bodySize)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, errors.New("ProjectKey value required"), startTime, r.URL.Path, bodySize)
		return
	}

	p, err := e.projects.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			logErr := fmt.Errorf("project doesn't exist or is not active, key: %s", *req.ProjectKey)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, logErr, startTime, r.URL.Path, bodySize)
		} else {
			e.log.Error(r.Context(), "failed to get project by key: %s, err: %s", *req.ProjectKey, err)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("can't find a project"), startTime, r.URL.Path, bodySize)
		}
		return
	}

	// Add projectID to context
	r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", p.ProjectID)))

	// Check if the project supports mobile sessions
	if !p.IsWeb() {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, errors.New("project doesn't support web sessions"), startTime, r.URL.Path, bodySize)
		return
	}

	ua := e.uaParser.ParseFromHTTPRequest(r)
	if ua == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, fmt.Errorf("browser not recognized, user-agent: %s", r.Header.Get("User-Agent")), startTime, r.URL.Path, bodySize)
		return
	}

	geoInfo := e.geoIP.ExtractGeoData(r)

	userUUID := uuid.GetUUID(req.UserUUID)
	tokenData, err := e.tokenizer.Parse(req.Token)
	if err != nil || req.Reset { // Starting the new one
		dice := byte(rand.Intn(100))
		// Use condition rate if it's set
		if req.Condition != "" {
			rate, err := e.conditions.GetRate(p.ProjectID, req.Condition, int(p.SampleRate))
			if err != nil {
				e.log.Warn(r.Context(), "can't get condition rate, condition: %s, err: %s", req.Condition, err)
			} else {
				p.SampleRate = byte(rate)
			}
		}
		if dice >= p.SampleRate {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, fmt.Errorf("capture rate miss, rate: %d", p.SampleRate), startTime, r.URL.Path, bodySize)
			return
		}

		startTimeMili := startTime.UnixMilli()
		sessionID, err := e.flaker.Compose(uint64(startTimeMili))
		if err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
			return
		}

		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{
			ID:      sessionID,
			Delay:   startTimeMili - req.Timestamp,
			ExpTime: expTime.UnixMilli(),
		}

		// Add sessionID to context
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionID)))

		if recordSession(req) {
			sessionStart := &SessionStart{
				Timestamp:            getSessionTimestamp(req, startTimeMili),
				ProjectID:            uint64(p.ProjectID),
				TrackerVersion:       req.TrackerVersion,
				RevID:                req.RevID,
				UserUUID:             userUUID,
				UserAgent:            r.Header.Get("User-Agent"),
				UserOS:               ua.OS,
				UserOSVersion:        ua.OSVersion,
				UserBrowser:          ua.Browser,
				UserBrowserVersion:   ua.BrowserVersion,
				UserDevice:           ua.Device,
				UserDeviceType:       ua.DeviceType,
				UserCountry:          geoInfo.Pack(),
				UserDeviceMemorySize: req.DeviceMemory,
				UserDeviceHeapSize:   req.JsHeapSizeLimit,
				UserID:               req.UserID,
			}

			// Save sessionStart to db
			if err := e.sessions.Add(&sessions.Session{
				SessionID:            sessionID,
				Platform:             "web",
				Timestamp:            sessionStart.Timestamp,
				Timezone:             req.Timezone,
				ProjectID:            uint32(sessionStart.ProjectID),
				TrackerVersion:       sessionStart.TrackerVersion,
				RevID:                sessionStart.RevID,
				UserUUID:             sessionStart.UserUUID,
				UserOS:               sessionStart.UserOS,
				UserOSVersion:        sessionStart.UserOSVersion,
				UserDevice:           sessionStart.UserDevice,
				UserCountry:          geoInfo.Country,
				UserState:            geoInfo.State,
				UserCity:             geoInfo.City,
				UserAgent:            sessionStart.UserAgent,
				UserBrowser:          sessionStart.UserBrowser,
				UserBrowserVersion:   sessionStart.UserBrowserVersion,
				UserDeviceType:       sessionStart.UserDeviceType,
				UserDeviceMemorySize: sessionStart.UserDeviceMemorySize,
				UserDeviceHeapSize:   sessionStart.UserDeviceHeapSize,
				UserID:               &sessionStart.UserID,
				ScreenWidth:          req.Width,
				ScreenHeight:         req.Height,
			}); err != nil {
				e.log.Warn(r.Context(), "can't insert sessionStart to DB: %s", err)
			}

			// Send sessionStart message to kafka
			if err := e.producer.Produce(e.cfg.TopicRawWeb, tokenData.ID, sessionStart.Encode()); err != nil {
				e.log.Error(r.Context(), "can't send sessionStart to queue: %s", err)
			}
		}
	} else {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", tokenData.ID)))
	}

	// Save information about session beacon size
	e.beaconSizeCache.Add(tokenData.ID, p.BeaconSize)

	startResponse := &StartSessionResponse{
		Token:                e.tokenizer.Compose(*tokenData),
		UserUUID:             userUUID,
		UserOS:               ua.OS,
		UserDevice:           ua.Device,
		UserBrowser:          ua.Browser,
		UserCountry:          geoInfo.Country,
		UserState:            geoInfo.State,
		UserCity:             geoInfo.City,
		SessionID:            strconv.FormatUint(tokenData.ID, 10),
		ProjectID:            strconv.FormatUint(uint64(p.ProjectID), 10),
		BeaconSizeLimit:      e.beaconSizeCache.Get(tokenData.ID),
		CompressionThreshold: e.cfg.CompressionThreshold,
		StartTimestamp:       int64(flakeid.ExtractTimestamp(tokenData.ID)),
		Delay:                tokenData.Delay,
		CanvasEnabled:        e.cfg.RecordCanvas,
		CanvasImageQuality:   e.cfg.CanvasQuality,
		CanvasFrameRate:      e.cfg.CanvasFps,
		Features:             e.features,
	}
	modifyResponse(req, startResponse)

	e.responser.ResponseWithJSON(e.log, r.Context(), w, startResponse, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) pushMessagesHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Get debug header with batch info
	if batch := r.URL.Query().Get("batch"); batch != "" {
		r = r.WithContext(context.WithValue(r.Context(), "batch", batch))
	}

	// Check authorization
	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	tokenJustExpired := false
	if err != nil {
		if errors.Is(err, token.JUST_EXPIRED) {
			tokenJustExpired = true
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
			return
		}
	}

	// Add sessionID and projectID to context
	if info, err := e.sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	// Check request body
	if r.Body == nil {
		errCode := http.StatusBadRequest
		if tokenJustExpired {
			errCode = http.StatusUnauthorized
		}
		e.responser.ResponseWithError(e.log, r.Context(), w, errCode, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadCompressedBody(e.log, w, r, e.beaconSizeCache.Get(sessionData.ID))
	if err != nil {
		errCode := http.StatusRequestEntityTooLarge
		if tokenJustExpired {
			errCode = http.StatusUnauthorized
		}
		e.responser.ResponseWithError(e.log, r.Context(), w, errCode, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Send processed messages to queue as array of bytes
	err = e.producer.Produce(e.cfg.TopicRawWeb, sessionData.ID, bodyBytes)
	if err != nil {
		e.log.Error(r.Context(), "can't send messages batch to queue: %s", err)
		errCode := http.StatusInternalServerError
		if tokenJustExpired {
			errCode = http.StatusUnauthorized
		}
		e.responser.ResponseWithError(e.log, r.Context(), w, errCode, errors.New("can't save message, try again"), startTime, r.URL.Path, bodySize)
		return
	}

	if tokenJustExpired {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, errors.New("token expired"), startTime, r.URL.Path, bodySize)
		return
	}
	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

type ScreenshotMessage struct {
	Name string
	Data []byte
}

func (e *handlersImpl) imagesUploaderHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil { // Should accept expired token?
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}

	// Add sessionID and projectID to context
	if info, err := e.sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	if r.Body == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, e.cfg.FileSizeLimit)
	defer r.Body.Close()

	// Parse the multipart form
	err = r.ParseMultipartForm(10 << 20) // Max upload size 10 MB
	if err == http.ErrNotMultipart || err == http.ErrMissingBoundary {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
	} else if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
		return
	}

	// Iterate over uploaded files
	for _, fileHeaderList := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaderList {
			file, err := fileHeader.Open()
			if err != nil {
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}

			// Read the file content
			fileBytes, err := io.ReadAll(file)
			if err != nil {
				file.Close()
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}
			file.Close()

			fileName := util.SafeString(fileHeader.Filename)

			// Create a message to send to Kafka
			msg := ScreenshotMessage{
				Name: fileName,
				Data: fileBytes,
			}
			data, err := json.Marshal(&msg)
			if err != nil {
				e.log.Warn(r.Context(), "can't marshal screenshot message, err: %s", err)
				continue
			}

			// Send the message to queue
			if err := e.producer.Produce(e.cfg.TopicCanvasImages, sessionData.ID, data); err != nil {
				e.log.Warn(r.Context(), "can't send screenshot message to queue, err: %s", err)
			}
		}
	}
	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, 0)
}
