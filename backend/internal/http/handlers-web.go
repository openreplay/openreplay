package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"log"
	"math/rand"
	"net/http"
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
		responseWithError(w, http.StatusBadRequest, errors.New("request body is empty"))
	}
	body := http.MaxBytesReader(w, r.Body, e.cfg.JsonSizeLimit)
	defer body.Close()

	// Parse request body
	req := &startSessionRequest{}
	if err := json.NewDecoder(body).Decode(req); err != nil {
		responseWithError(w, http.StatusBadRequest, err)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		responseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"))
		return
	}

	p, err := e.services.pgconn.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			responseWithError(w, http.StatusNotFound, errors.New("Project doesn't exist or capture limit has been reached"))
		} else {
			responseWithError(w, http.StatusInternalServerError, err) // TODO: send error here only on staging
		}
		return
	}

	userUUID := getUUID(req.UserUUID)
	tokenData, err := e.services.tokenizer.Parse(req.Token)
	if err != nil || req.Reset { // Starting the new one
		dice := byte(rand.Intn(100)) // [0, 100)
		if dice >= p.SampleRate {
			responseWithError(w, http.StatusForbidden, errors.New("cancel"))
			return
		}

		ua := e.services.uaParser.ParseFromHTTPRequest(r)
		if ua == nil {
			responseWithError(w, http.StatusForbidden, errors.New("browser not recognized"))
			return
		}
		sessionID, err := e.services.flaker.Compose(uint64(startTime.UnixNano() / 1e6))
		if err != nil {
			responseWithError(w, http.StatusInternalServerError, err)
			return
		}
		// TODO: if EXPIRED => send message for two sessions association
		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{ID: sessionID, ExpTime: expTime.UnixNano() / 1e6}

		e.services.producer.Produce(e.cfg.TopicRawWeb, tokenData.ID, Encode(&SessionStart{
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
			UserCountry:          e.services.geoIP.ExtractISOCodeFromHTTPRequest(r),
			UserDeviceMemorySize: req.DeviceMemory,
			UserDeviceHeapSize:   req.JsHeapSizeLimit,
			UserID:               req.UserID,
		}))
	}

	responseWithJSON(w, &startSessionResponse{
		Token:           e.services.tokenizer.Compose(*tokenData),
		UserUUID:        userUUID,
		SessionID:       strconv.FormatUint(tokenData.ID, 10),
		BeaconSizeLimit: e.cfg.BeaconSizeLimit,
	})
}

func (e *Router) pushMessagesHandlerWeb(w http.ResponseWriter, r *http.Request) {
	// Check authorization
	sessionData, err := e.services.tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		responseWithError(w, http.StatusUnauthorized, err)
		return
	}

	// Check request body
	if r.Body == nil {
		responseWithError(w, http.StatusBadRequest, errors.New("request body is empty"))
	}
	body := http.MaxBytesReader(w, r.Body, e.cfg.BeaconSizeLimit)
	defer body.Close()

	var handledMessages bytes.Buffer

	// Process each message in request data
	err = ReadBatchReader(body, func(msg Message) {
		switch m := msg.(type) {
		case *SetNodeAttributeURLBased:
			if m.Name == "src" || m.Name == "href" {
				msg = &SetNodeAttribute{
					ID:    m.ID,
					Name:  m.Name,
					Value: e.handleURL(sessionData.ID, m.BaseURL, m.Value),
				}
			} else if m.Name == "style" {
				msg = &SetNodeAttribute{
					ID:    m.ID,
					Name:  m.Name,
					Value: e.handleCSS(sessionData.ID, m.BaseURL, m.Value),
				}
			}
		case *SetCSSDataURLBased:
			msg = &SetCSSData{
				ID:   m.ID,
				Data: e.handleCSS(sessionData.ID, m.BaseURL, m.Data),
			}
		case *CSSInsertRuleURLBased:
			msg = &CSSInsertRule{
				ID:    m.ID,
				Index: m.Index,
				Rule:  e.handleCSS(sessionData.ID, m.BaseURL, m.Rule),
			}
		}
		handledMessages.Write(msg.Encode())
	})
	if err != nil {
		responseWithError(w, http.StatusForbidden, err)
		return
	}

	// Send processed messages to queue as array of bytes
	err = e.services.producer.Produce(e.cfg.TopicRawWeb, sessionData.ID, handledMessages.Bytes())
	if err != nil {
		log.Printf("can't send processed messages to queue: %s", err)
	}

	w.WriteHeader(http.StatusOK)
}

func (e *Router) notStartedHandlerWeb(w http.ResponseWriter, r *http.Request) {
	// Check request body
	if r.Body == nil {
		responseWithError(w, http.StatusBadRequest, errors.New("request body is empty"))
	}
	body := http.MaxBytesReader(w, r.Body, e.cfg.JsonSizeLimit)
	defer body.Close()

	// Parse request body
	req := &notStartedRequest{}
	if err := json.NewDecoder(body).Decode(req); err != nil {
		responseWithError(w, http.StatusBadRequest, err)
		return
	}

	// Handler's logic
	if req.ProjectKey == nil {
		responseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"))
		return
	}
	ua := e.services.uaParser.ParseFromHTTPRequest(r) // TODO?: insert anyway
	if ua == nil {
		responseWithError(w, http.StatusForbidden, errors.New("browser not recognized"))
		return
	}
	country := e.services.geoIP.ExtractISOCodeFromHTTPRequest(r)
	err := e.services.pgconn.InsertUnstartedSession(postgres.UnstartedSession{
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
