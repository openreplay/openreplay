package router

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"openreplay/backend/internal/http/ios"
	"openreplay/backend/internal/http/util"
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
	req := &StartIOSSessionRequest{}

	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
		return
	}
	body := http.MaxBytesReader(w, r.Body, e.cfg.JsonSizeLimit)
	defer body.Close()

	if err := json.NewDecoder(body).Decode(req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, 0)
		return
	}

	if req.ProjectKey == nil {
		ResponseWithError(w, http.StatusForbidden, errors.New("ProjectKey value required"), startTime, r.URL.Path, 0)
		return
	}

	p, err := e.services.Projects.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			ResponseWithError(w, http.StatusNotFound, errors.New("Project doesn't exist or is not active"), startTime, r.URL.Path, 0)
		} else {
			ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0) // TODO: send error here only on staging
		}
		return
	}

	// Check if the project supports mobile sessions
	if !p.IsMobile() {
		ResponseWithError(w, http.StatusForbidden, errors.New("project doesn't support mobile sessions"), startTime, r.URL.Path, 0)
		return
	}

	if !checkMobileTrackerVersion(req.TrackerVersion) {
		ResponseWithError(w, http.StatusUpgradeRequired, errors.New("tracker version not supported"), startTime, r.URL.Path, 0)
		return
	}

	userUUID := uuid.GetUUID(req.UserUUID)
	tokenData, err := e.services.Tokenizer.Parse(req.Token)

	if err != nil { // Starting the new one
		dice := byte(rand.Intn(100)) // [0, 100)
		if dice >= p.SampleRate {
			ResponseWithError(w, http.StatusForbidden, errors.New("cancel"), startTime, r.URL.Path, 0)
			return
		}

		ua := e.services.UaParser.ParseFromHTTPRequest(r)
		if ua == nil {
			ResponseWithError(w, http.StatusForbidden, errors.New("browser not recognized"), startTime, r.URL.Path, 0)
			return
		}
		sessionID, err := e.services.Flaker.Compose(uint64(startTime.UnixMilli()))
		if err != nil {
			ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
			return
		}
		// TODO: if EXPIRED => send message for two sessions association
		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{sessionID, 0, expTime.UnixMilli()}

		geoInfo := e.ExtractGeoData(r)

		if err := e.services.Sessions.Add(&sessions.Session{
			SessionID:            sessionID,
			Platform:             "ios",
			Timestamp:            req.Timestamp,
			Timezone:             req.Timezone,
			ProjectID:            p.ProjectID,
			TrackerVersion:       req.TrackerVersion,
			RevID:                req.RevID,
			UserUUID:             userUUID,
			UserOS:               "IOS",
			UserOSVersion:        req.UserOSVersion,
			UserDevice:           ios.MapIOSDevice(req.UserDevice),
			UserDeviceType:       ios.GetIOSDeviceType(req.UserDevice),
			UserCountry:          geoInfo.Country,
			UserState:            geoInfo.State,
			UserCity:             geoInfo.City,
			UserDeviceMemorySize: req.DeviceMemory,
			UserDeviceHeapSize:   req.DeviceMemory,
		}); err != nil {
			log.Printf("failed to add mobile session to DB: %v", err)
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
		log.Printf("mobile session start: %+v", sessStart)

		if err := e.services.Producer.Produce(e.cfg.TopicRawIOS, tokenData.ID, sessStart.Encode()); err != nil {
			log.Printf("failed to produce mobile session start message: %v", err)
		}
	}

	ResponseWithJSON(w, &StartIOSSessionResponse{
		Token:           e.services.Tokenizer.Compose(*tokenData),
		UserUUID:        userUUID,
		SessionID:       strconv.FormatUint(tokenData.ID, 10),
		BeaconSizeLimit: e.cfg.BeaconSizeLimit,
		ImageQuality:    "standard", // Pull from project settings (low, standard, high)
		FrameRate:       3,          // Pull from project settings
	}, startTime, r.URL.Path, 0)
}

func (e *Router) pushMessagesHandlerIOS(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}
	e.pushMessages(w, r, sessionData.ID, e.cfg.TopicRawIOS)
}

func (e *Router) pushLateMessagesHandlerIOS(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil && err != token.EXPIRED {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}
	// Check timestamps here?
	e.pushMessages(w, r, sessionData.ID, e.cfg.TopicRawIOS)
}

func (e *Router) imagesUploadHandlerIOS(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil { // Should accept expired token?
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}

	if r.Body == nil {
		ResponseWithError(w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, e.cfg.FileSizeLimit)
	defer r.Body.Close()

	err = r.ParseMultipartForm(5 * 1e6) // ~5Mb
	if err == http.ErrNotMultipart || err == http.ErrMissingBoundary {
		ResponseWithError(w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
	} else if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0) // TODO: send error here only on staging
		return
	}

	if r.MultipartForm == nil {
		ResponseWithError(w, http.StatusInternalServerError, errors.New("Multipart not parsed"), startTime, r.URL.Path, 0)
		return
	}

	if len(r.MultipartForm.Value["projectKey"]) == 0 {
		ResponseWithError(w, http.StatusBadRequest, errors.New("projectKey parameter missing"), startTime, r.URL.Path, 0) // status for missing/wrong parameter?
		return
	}

	for _, fileHeaderList := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaderList {
			file, err := fileHeader.Open()
			if err != nil {
				continue
			}

			data, err := ioutil.ReadAll(file)
			if err != nil {
				log.Fatalf("failed reading data: %s", err)
			}

			log.Printf("Uploading image... %v, len: %d", util.SafeString(fileHeader.Filename), len(data))

			if err := e.services.Producer.Produce(e.cfg.TopicRawImages, sessionData.ID, data); err != nil {
				log.Printf("failed to produce mobile session start message: %v", err)
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}
