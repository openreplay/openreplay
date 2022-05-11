package router

import (
	"bytes"
	"encoding/json"
	"errors"
	"log"
	"math/rand"
	"net/http"
	"openreplay/backend/internal/uuid"
	"strconv"
	"time"

	"openreplay/backend/pkg/db/postgres"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/token"
)

func (e *Router) startSessionHandlerWeb(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Check request body
	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"))
		return
	}
	body := http.MaxBytesReader(w, r.Body, e.cfg.JsonSizeLimit)
	defer body.Close()

	// Parse request body
	req := &StartSessionRequest{}
	if err := json.NewDecoder(body).Decode(req); err != nil {
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
			ResponseWithError(w, http.StatusNotFound, errors.New("Project doesn't exist or capture limit has been reached"))
		} else {
			ResponseWithError(w, http.StatusInternalServerError, err) // TODO: send error here only on staging
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

		e.services.Producer.Produce(e.cfg.TopicRawWeb, tokenData.ID, Encode(&SessionStart{
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
		}))
	}

	ResponseWithJSON(w, &StartSessionResponse{
		Token:           e.services.Tokenizer.Compose(*tokenData),
		UserUUID:        userUUID,
		SessionID:       strconv.FormatUint(tokenData.ID, 10),
		BeaconSizeLimit: e.cfg.BeaconSizeLimit,
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
	body := http.MaxBytesReader(w, r.Body, e.cfg.BeaconSizeLimit)
	defer body.Close()

	var handledMessages bytes.Buffer

	// Process each message in request data
	err = ReadBatchReader(body, func(msg Message) {
		msg = e.services.Assets.ParseAssets(sessionData.ID, msg)
		handledMessages.Write(msg.Encode())
	})
	if err != nil {
		ResponseWithError(w, http.StatusForbidden, err)
		return
	}

	// Send processed messages to queue as array of bytes
	err = e.services.Producer.Produce(e.cfg.TopicRawWeb, sessionData.ID, handledMessages.Bytes())
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
	body := http.MaxBytesReader(w, r.Body, e.cfg.JsonSizeLimit)
	defer body.Close()

	// Parse request body
	req := &NotStartedRequest{}
	if err := json.NewDecoder(body).Decode(req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"))
		return
	}
	ua := e.services.UaParser.ParseFromHTTPRequest(r) // TODO?: insert anyway
	if ua == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("browser not recognized"))
		return
	}
	country := e.services.GeoIP.ExtractISOCodeFromHTTPRequest(r)
	err := e.services.Database.InsertUnstartedSession(postgres.UnstartedSession{
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
