package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"openreplay/backend/pkg/featureflags"
	"openreplay/backend/pkg/sessions"
	"strconv"
	"time"

	"github.com/Masterminds/semver"
	"github.com/klauspost/compress/gzip"
	"openreplay/backend/internal/http/uuid"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/flakeid"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/token"
)

func (e *Router) readBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	var (
		bodyBytes []byte
		err       error
	)

	// Check if body is gzipped and decompress it
	if r.Header.Get("Content-Encoding") == "gzip" {
		reader, err := gzip.NewReader(body)
		if err != nil {
			return nil, fmt.Errorf("can't create gzip reader: %s", err)
		}
		bodyBytes, err = io.ReadAll(reader)
		if err != nil {
			return nil, fmt.Errorf("can't read gzip body: %s", err)
		}
		if err := reader.Close(); err != nil {
			log.Printf("can't close gzip reader: %s", err)
		}
	} else {
		bodyBytes, err = io.ReadAll(body)
	}

	// Close body
	if closeErr := body.Close(); closeErr != nil {
		log.Printf("error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func getSessionTimestamp(req *StartSessionRequest, startTimeMili int64) (ts uint64) {
	ts = uint64(req.Timestamp)
	c, err := semver.NewConstraint(">=4.1.6")
	if err != nil {
		return
	}
	v, err := semver.NewVersion(req.TrackerVersion)
	if err != nil {
		return
	}
	if c.Check(v) {
		return uint64(startTimeMili)
	}
	return
}

func (e *Router) startSessionHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		log.Printf("error while reading request body: %s", err)
		ResponseWithError(w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Parse request body
	req := &StartSessionRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"), startTime, r.URL.Path, bodySize)
		return
	}

	p, err := e.services.Projects.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			ResponseWithError(w, http.StatusNotFound,
				errors.New("project doesn't exist or capture limit has been reached"), startTime, r.URL.Path, bodySize)
		} else {
			log.Printf("can't get project by key: %s", err)
			ResponseWithError(w, http.StatusInternalServerError, errors.New("can't get project by key"), startTime, r.URL.Path, bodySize)
		}
		return
	}

	ua := e.services.UaParser.ParseFromHTTPRequest(r)
	if ua == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("browser not recognized"), startTime, r.URL.Path, bodySize)
		return
	}

	geoInfo := e.ExtractGeoData(r)

	userUUID := uuid.GetUUID(req.UserUUID)
	tokenData, err := e.services.Tokenizer.Parse(req.Token)
	if err != nil || req.Reset { // Starting the new one
		dice := byte(rand.Intn(100)) // [0, 100)
		if dice >= p.SampleRate {
			ResponseWithError(w, http.StatusForbidden, errors.New("cancel"), startTime, r.URL.Path, bodySize)
			return
		}

		startTimeMili := startTime.UnixMilli()
		sessionID, err := e.services.Flaker.Compose(uint64(startTimeMili))
		if err != nil {
			ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
			return
		}
		// TODO: if EXPIRED => send message for two sessions association
		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{
			ID:      sessionID,
			Delay:   startTimeMili - req.Timestamp,
			ExpTime: expTime.UnixMilli(),
		}

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
		if err := e.services.Sessions.Add(&sessions.Session{
			SessionID:            sessionID,
			Platform:             "web",
			Timestamp:            sessionStart.Timestamp,
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
		}); err != nil {
			log.Printf("can't insert session start: %s", err)
		}

		// Send sessionStart message to kafka
		if err := e.services.Producer.Produce(e.cfg.TopicRawWeb, tokenData.ID, sessionStart.Encode()); err != nil {
			log.Printf("can't send session start: %s", err)
		}
	}

	// Save information about session beacon size
	e.addBeaconSize(tokenData.ID, p.BeaconSize)

	ResponseWithJSON(w, &StartSessionResponse{
		Token:                e.services.Tokenizer.Compose(*tokenData),
		UserUUID:             userUUID,
		UserOS:               ua.OS,
		UserDevice:           ua.Device,
		UserBrowser:          ua.Browser,
		UserCountry:          geoInfo.Country,
		UserState:            geoInfo.State,
		UserCity:             geoInfo.City,
		SessionID:            strconv.FormatUint(tokenData.ID, 10),
		ProjectID:            strconv.FormatUint(uint64(p.ProjectID), 10),
		BeaconSizeLimit:      e.getBeaconSize(tokenData.ID),
		CompressionThreshold: e.getCompressionThreshold(),
		StartTimestamp:       int64(flakeid.ExtractTimestamp(tokenData.ID)),
		Delay:                tokenData.Delay,
	}, startTime, r.URL.Path, bodySize)
}

func (e *Router) pushMessagesHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.readBody(w, r, e.getBeaconSize(sessionData.ID))
	if err != nil {
		log.Printf("error while reading request body: %s", err)
		ResponseWithError(w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Send processed messages to queue as array of bytes
	// TODO: check bytes for nonsense crap
	err = e.services.Producer.Produce(e.cfg.TopicRawWeb, sessionData.ID, bodyBytes)
	if err != nil {
		log.Printf("can't send processed messages to queue: %s", err)
	}

	ResponseOK(w, startTime, r.URL.Path, bodySize)
}

func (e *Router) notStartedHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		log.Printf("error while reading request body: %s", err)
		ResponseWithError(w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Parse request body
	req := &NotStartedRequest{}

	if err := json.Unmarshal(bodyBytes, req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("projectKey value required"), startTime, r.URL.Path, bodySize)
		return
	}
	ua := e.services.UaParser.ParseFromHTTPRequest(r) // TODO?: insert anyway
	if ua == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("browser not recognized"), startTime, r.URL.Path, bodySize)
		return
	}
	geoInfo := e.ExtractGeoData(r)
	err = e.services.Sessions.AddUnStarted(&sessions.UnStartedSession{
		ProjectKey:         *req.ProjectKey,
		TrackerVersion:     req.TrackerVersion,
		DoNotTrack:         req.DoNotTrack,
		Platform:           "web",
		UserAgent:          r.Header.Get("User-Agent"),
		UserOS:             ua.OS,
		UserOSVersion:      ua.OSVersion,
		UserBrowser:        ua.Browser,
		UserBrowserVersion: ua.BrowserVersion,
		UserDevice:         ua.Device,
		UserDeviceType:     ua.DeviceType,
		UserCountry:        geoInfo.Country,
		UserState:          geoInfo.State,
		UserCity:           geoInfo.City,
	})
	if err != nil {
		log.Printf("Unable to insert Unstarted Session: %v\n", err)
	}

	ResponseOK(w, startTime, r.URL.Path, bodySize)
}

func (e *Router) featureFlagsHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	_, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		log.Printf("error while reading request body: %s", err)
		ResponseWithError(w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Parse request body
	req := &featureflags.FeatureFlagsRequest{}

	if err := json.Unmarshal(bodyBytes, req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	computedFlags, err := e.services.FeatureFlags.ComputeFlagsForSession(req)
	if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &featureflags.FeatureFlagsResponse{
		Flags: computedFlags,
	}
	ResponseWithJSON(w, resp, startTime, r.URL.Path, bodySize)
}
