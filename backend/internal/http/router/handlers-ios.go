package router

import (
	"encoding/json"
	"errors"
	"log"
	"math/rand"
	"net/http"
	"openreplay/backend/internal/http/ios"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/internal/http/uuid"
	"openreplay/backend/pkg/objectstorage"
	"strconv"
	"time"

	"openreplay/backend/pkg/db/postgres"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/token"
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

	p, err := e.services.Database.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			ResponseWithError(w, http.StatusNotFound, errors.New("Project doesn't exist or is not active"), startTime, r.URL.Path, 0)
		} else {
			ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0) // TODO: send error here only on staging
		}
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

		// The difference with web is mostly here:
		sessStart := &IOSSessionStart{
			Timestamp:      req.Timestamp,
			ProjectID:      uint64(p.ProjectID),
			TrackerVersion: req.TrackerVersion,
			RevID:          req.RevID,
			UserUUID:       userUUID,
			UserOS:         "IOS",
			UserOSVersion:  req.UserOSVersion,
			UserDevice:     ios.MapIOSDevice(req.UserDevice),
			UserDeviceType: ios.GetIOSDeviceType(req.UserDevice),
			UserCountry:    geoInfo.Country,
		}
		e.services.Producer.Produce(e.cfg.TopicRawIOS, tokenData.ID, sessStart.Encode())
	}

	ResponseWithJSON(w, &StartIOSSessionResponse{
		Token:           e.services.Tokenizer.Compose(*tokenData),
		UserUUID:        userUUID,
		SessionID:       strconv.FormatUint(tokenData.ID, 10),
		BeaconSizeLimit: e.cfg.BeaconSizeLimit,
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
	log.Printf("recieved imagerequest")

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

	err = r.ParseMultipartForm(1e6) // ~1Mb
	if err == http.ErrNotMultipart || err == http.ErrMissingBoundary {
		ResponseWithError(w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
		// } else if err == multipart.ErrMessageTooLarge // if non-files part exceeds 10 MB
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

	prefix := r.MultipartForm.Value["projectKey"][0] + "/" + strconv.FormatUint(sessionData.ID, 10) + "/"

	for _, fileHeaderList := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaderList {
			file, err := fileHeader.Open()
			if err != nil {
				continue // TODO: send server error or accumulate successful files
			}
			key := prefix + fileHeader.Filename
			log.Printf("Uploading image... %v", util.SafeString(key))
			go func() { //TODO: mime type from header
				if err := e.services.Storage.Upload(file, key, "image/jpeg", objectstorage.NoCompression); err != nil {
					log.Printf("Upload ios screen error. %v", err)
				}
			}()
		}
	}

	w.WriteHeader(http.StatusOK)
}
