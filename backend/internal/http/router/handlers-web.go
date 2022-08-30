package router

import (
	"encoding/json"
	"errors"
	"go.opentelemetry.io/otel/attribute"
	"io"
	"log"
	"math/rand"
	"net/http"
	"openreplay/backend/internal/http/uuid"
	"openreplay/backend/pkg/flakeid"
	"strconv"
	"time"

	"openreplay/backend/pkg/db/postgres"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/token"
)

func (e *Router) readBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	bodyBytes, err := io.ReadAll(body)
	if closeErr := body.Close(); closeErr != nil {
		log.Printf("error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}

	reqSize := len(bodyBytes)
	e.requestSize.Record(
		r.Context(),
		float64(reqSize),
		[]attribute.KeyValue{attribute.String("method", r.URL.Path)}...,
	)
	return bodyBytes, nil
}

func (e *Router) startSessionHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"))
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		log.Printf("error while reading request body: %s", err)
		ResponseWithError(w, http.StatusRequestEntityTooLarge, err)
		return
	}

	// Parse request body
	req := &StartSessionRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"))
		return
	}

	p, err := e.services.Database.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			ResponseWithError(w, http.StatusNotFound, errors.New("project doesn't exist or capture limit has been reached"))
		} else {
			log.Printf("can't get project by key: %s", err)
			ResponseWithError(w, http.StatusInternalServerError, errors.New("can't get project by key"))
		}
		return
	}

	userUUID := uuid.GetUUID(req.UserUUID)
	tokenData, err := e.services.Tokenizer.Parse(req.Token)
	if err != nil || req.Reset { // Starting the new one
		dice := byte(rand.Intn(100)) // [0, 100)
		if dice >= p.SampleRate {
			ResponseWithError(w, http.StatusForbidden, errors.New("cancel"))
			return
		}

		ua := e.services.UaParser.ParseFromHTTPRequest(r)
		if ua == nil {
			ResponseWithError(w, http.StatusForbidden, errors.New("browser not recognized"))
			return
		}
		sessionID, err := e.services.Flaker.Compose(uint64(startTime.UnixMilli()))
		if err != nil {
			ResponseWithError(w, http.StatusInternalServerError, err)
			return
		}
		// TODO: if EXPIRED => send message for two sessions association
		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{ID: sessionID, ExpTime: expTime.UnixMilli()}

		sessionStart := &SessionStart{
			Timestamp:            req.Timestamp,
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
			UserCountry:          e.services.GeoIP.ExtractISOCodeFromHTTPRequest(r),
			UserDeviceMemorySize: req.DeviceMemory,
			UserDeviceHeapSize:   req.JsHeapSizeLimit,
			UserID:               req.UserID,
		}

		// Save sessionStart to db
		if err := e.services.Database.InsertWebSessionStart(sessionID, sessionStart); err != nil {
			log.Printf("can't insert session start: %s", err)
		}

		// Send sessionStart message to kafka
		if err := e.services.Producer.Produce(e.cfg.TopicRawWeb, tokenData.ID, Encode(sessionStart)); err != nil {
			log.Printf("can't send session start: %s", err)
		}
	}

	ResponseWithJSON(w, &StartSessionResponse{
		Token:           e.services.Tokenizer.Compose(*tokenData),
		UserUUID:        userUUID,
		SessionID:       strconv.FormatUint(tokenData.ID, 10),
		ProjectID:       strconv.FormatUint(uint64(p.ProjectID), 10),
		BeaconSizeLimit: e.cfg.BeaconSizeLimit,
		StartTimestamp:  int64(flakeid.ExtractTimestamp(tokenData.ID)),
	})
}

func (e *Router) pushMessagesHandlerWeb(w http.ResponseWriter, r *http.Request) {
	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err)
		return
	}

	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"))
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.BeaconSizeLimit)
	if err != nil {
		log.Printf("error while reading request body: %s", err)
		ResponseWithError(w, http.StatusRequestEntityTooLarge, err)
		return
	}

	// Send processed messages to queue as array of bytes
	// TODO: check bytes for nonsense crap
	err = e.services.Producer.Produce(e.cfg.TopicRawWeb, sessionData.ID, bodyBytes)
	if err != nil {
		log.Printf("can't send processed messages to queue: %s", err)
	}

	w.WriteHeader(http.StatusOK)
}

func (e *Router) notStartedHandlerWeb(w http.ResponseWriter, r *http.Request) {
	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"))
		return
	}

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		log.Printf("error while reading request body: %s", err)
		ResponseWithError(w, http.StatusRequestEntityTooLarge, err)
		return
	}

	// Parse request body
	req := &NotStartedRequest{}

	if err := json.Unmarshal(bodyBytes, req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("projectKey value required"))
		return
	}
	ua := e.services.UaParser.ParseFromHTTPRequest(r) // TODO?: insert anyway
	if ua == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("browser not recognized"))
		return
	}
	country := e.services.GeoIP.ExtractISOCodeFromHTTPRequest(r)
	err = e.services.Database.InsertUnstartedSession(postgres.UnstartedSession{
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
		UserCountry:        country,
	})
	if err != nil {
		log.Printf("Unable to insert Unstarted Session: %v\n", err)
	}

	w.WriteHeader(http.StatusOK)
}
