package router

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"openreplay/backend/internal/http/ios"
	"openreplay/backend/internal/http/uuid"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
	"strconv"
	"time"
)

func (e *Router) startSessionHandlerIOS(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	if r.Body == nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
		return
	}
	body := http.MaxBytesReader(w, r.Body, e.cfg.JsonSizeLimit)
	defer body.Close()

	req := &StartMobileSessionRequest{}
	if err := json.NewDecoder(body).Decode(req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, 0)
		return
	}

	// Add tracker version to context
	r = r.WithContext(context.WithValue(r.Context(), "tracker", req.TrackerVersion))

	if req.ProjectKey == nil {
		e.ResponseWithError(r.Context(), w, http.StatusForbidden, errors.New("projectKey value required"), startTime, r.URL.Path, 0)
		return
	}

	p, err := e.services.Projects.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			logErr := fmt.Errorf("project doesn't exist or is not active, key: %s", *req.ProjectKey)
			e.ResponseWithError(r.Context(), w, http.StatusNotFound, logErr, startTime, r.URL.Path, 0)
		} else {
			e.log.Error(r.Context(), "failed to get project by key: %s, err: %s", *req.ProjectKey, err)
			e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, errors.New("can't find a project"), startTime, r.URL.Path, 0)
		}
		return
	}

	// Add projectID to context
	r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", p.ProjectID)))

	// Check if the project supports mobile sessions
	if !p.IsMobile() {
		e.ResponseWithError(r.Context(), w, http.StatusForbidden, errors.New("project doesn't support mobile sessions"), startTime, r.URL.Path, 0)
		return
	}

	if !checkMobileTrackerVersion(req.TrackerVersion) {
		e.ResponseWithError(r.Context(), w, http.StatusUpgradeRequired, errors.New("tracker version not supported"), startTime, r.URL.Path, 0)
		return
	}

	userUUID := uuid.GetUUID(req.UserUUID)
	tokenData, err := e.services.Tokenizer.Parse(req.Token)

	if err != nil { // Starting the new one
		dice := byte(rand.Intn(100)) // [0, 100)
		// Use condition rate if it's set
		if req.Condition != "" {
			rate, err := e.services.Conditions.GetRate(p.ProjectID, req.Condition, int(p.SampleRate))
			if err != nil {
				e.log.Warn(r.Context(), "can't get condition rate, condition: %s, err: %s", req.Condition, err)
			} else {
				p.SampleRate = byte(rate)
			}
		}
		if dice >= p.SampleRate {
			e.ResponseWithError(r.Context(), w, http.StatusForbidden, fmt.Errorf("capture rate miss, rate: %d", p.SampleRate), startTime, r.URL.Path, 0)
			return
		}

		ua := e.services.UaParser.ParseFromHTTPRequest(r)
		if ua == nil {
			e.ResponseWithError(r.Context(), w, http.StatusForbidden, fmt.Errorf("browser not recognized, user-agent: %s", r.Header.Get("User-Agent")), startTime, r.URL.Path, 0)
			return
		}
		sessionID, err := e.services.Flaker.Compose(uint64(startTime.UnixMilli()))
		if err != nil {
			e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
			return
		}

		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{sessionID, 0, expTime.UnixMilli()}

		// Add sessionID to context
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionID)))

		geoInfo := e.ExtractGeoData(r)
		platform, os, screen := "ios", "IOS", ""
		if req.Platform != "" && req.Platform != "ios" {
			platform = req.Platform
			os = "Android"
			screen = fmt.Sprintf("%d:%d", req.Width, req.Height)
		}

		if !req.DoNotRecord {
			if err := e.services.Sessions.Add(&sessions.Session{
				SessionID:            sessionID,
				Platform:             platform,
				Timestamp:            req.Timestamp,
				Timezone:             req.Timezone,
				ProjectID:            p.ProjectID,
				TrackerVersion:       req.TrackerVersion,
				RevID:                req.RevID,
				UserUUID:             userUUID,
				UserOS:               os,
				UserOSVersion:        req.UserOSVersion,
				UserDevice:           ios.MapIOSDevice(req.UserDevice),
				UserDeviceType:       ios.GetIOSDeviceType(req.UserDevice),
				UserCountry:          geoInfo.Country,
				UserState:            geoInfo.State,
				UserCity:             geoInfo.City,
				UserDeviceMemorySize: req.DeviceMemory,
				UserDeviceHeapSize:   req.DeviceMemory,
				UserBrowser:          screen,
			}); err != nil {
				e.log.Warn(r.Context(), "failed to add mobile session to DB: %s", err)
			}

			sessStart := &messages.IOSSessionStart{
				Timestamp:      req.Timestamp,
				ProjectID:      uint64(p.ProjectID),
				TrackerVersion: req.TrackerVersion,
				RevID:          req.RevID,
				UserUUID:       userUUID,
				UserOS:         "IOS",
				UserOSVersion:  req.UserOSVersion,
				UserDevice:     ios.MapIOSDevice(req.UserDevice),
				UserDeviceType: ios.GetIOSDeviceType(req.UserDevice),
				UserCountry:    geoInfo.Pack(),
			}

			if err := e.services.Producer.Produce(e.cfg.TopicRawIOS, tokenData.ID, sessStart.Encode()); err != nil {
				e.log.Error(r.Context(), "failed to send mobile sessionStart event to queue: %s", err)
			}
		}
	}

	e.ResponseWithJSON(r.Context(), w, &StartMobileSessionResponse{
		Token:           e.services.Tokenizer.Compose(*tokenData),
		UserUUID:        userUUID,
		SessionID:       strconv.FormatUint(tokenData.ID, 10),
		BeaconSizeLimit: e.cfg.BeaconSizeLimit,
		ImageQuality:    e.cfg.MobileQuality,
		FrameRate:       e.cfg.MobileFps,
		ProjectID:       strconv.FormatUint(uint64(p.ProjectID), 10),
	}, startTime, r.URL.Path, 0)
}

func (e *Router) pushMessagesHandlerIOS(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}

	// Add sessionID and projectID to context
	if info, err := e.services.Sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	e.pushMessages(w, r, sessionData.ID, e.cfg.TopicRawIOS)
}

func (e *Router) pushLateMessagesHandlerIOS(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}

	if err != nil && err != token.EXPIRED {
		e.ResponseWithError(r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}
	// Check timestamps here?
	e.pushMessages(w, r, sessionData.ID, e.cfg.TopicRawIOS)
}

func (e *Router) imagesUploadHandlerIOS(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}

	// Add sessionID and projectID to context
	if info, err := e.services.Sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	if r.Body == nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, e.cfg.FileSizeLimit)
	defer r.Body.Close()

	err = r.ParseMultipartForm(5 * 1e6) // ~5Mb
	if err == http.ErrNotMultipart || err == http.ErrMissingBoundary {
		e.ResponseWithError(r.Context(), w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
	} else if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0) // TODO: send error here only on staging
		return
	}

	if r.MultipartForm == nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, errors.New("multipart not parsed"), startTime, r.URL.Path, 0)
		return
	}

	if len(r.MultipartForm.Value["projectKey"]) == 0 {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, errors.New("projectKey parameter missing"), startTime, r.URL.Path, 0) // status for missing/wrong parameter?
		return
	}

	for _, fileHeaderList := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaderList {
			file, err := fileHeader.Open()
			if err != nil {
				continue
			}

			data, err := io.ReadAll(file)
			if err != nil {
				file.Close()
				e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}
			file.Close()

			if err := e.services.Producer.Produce(e.cfg.TopicRawImages, sessionData.ID, data); err != nil {
				e.log.Warn(r.Context(), "failed to send image to queue: %s", err)
			}
		}
	}

	e.ResponseOK(r.Context(), w, startTime, r.URL.Path, 0)
}
