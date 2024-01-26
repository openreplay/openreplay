package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/mux"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/pkg/featureflags"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/uxtesting"
	"strconv"
	"strings"
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

func checkMobileTrackerVersion(ver string) bool {
	c, err := semver.NewConstraint(">=1.0.9")
	if err != nil {
		return false
	}
	// Check for beta version
	parts := strings.Split(ver, "-")
	if len(parts) > 1 {
		ver = parts[0]
	}
	v, err := semver.NewVersion(ver)
	if err != nil {
		return false
	}
	return c.Check(v)
}

func getSessionTimestamp(req *StartSessionRequest, startTimeMili int64) (ts uint64) {
	ts = uint64(req.Timestamp)
	if req.IsOffline {
		return
	}
	c, err := semver.NewConstraint(">=4.1.6")
	if err != nil {
		return
	}
	ver := req.TrackerVersion
	parts := strings.Split(ver, "-")
	if len(parts) > 1 {
		ver = parts[0]
	}
	v, err := semver.NewVersion(ver)
	if err != nil {
		return
	}
	if c.Check(v) {
		ts = uint64(startTimeMili)
		if req.BufferDiff > 0 && req.BufferDiff < 5*60*1000 {
			ts -= req.BufferDiff
		}
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

	// Check if the project supports mobile sessions
	if !p.IsWeb() {
		ResponseWithError(w, http.StatusForbidden, errors.New("project doesn't support web sessions"), startTime, r.URL.Path, bodySize)
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
		// Use condition rate if it's set
		if req.Condition != "" {
			rate, err := e.services.Conditions.GetRate(p.ProjectID, req.Condition, int(p.SampleRate))
			if err != nil {
				log.Printf("can't get condition rate: %s", err)
			} else {
				p.SampleRate = byte(rate)
			}
		} else {
			log.Printf("project sample rate: %d", p.SampleRate)
		}
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

		if !req.DoNotRecord {
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
			}); err != nil {
				log.Printf("can't insert session start: %s", err)
			}

			// Send sessionStart message to kafka
			if err := e.services.Producer.Produce(e.cfg.TopicRawWeb, tokenData.ID, sessionStart.Encode()); err != nil {
				log.Printf("can't send session start: %s", err)
			}
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
		CanvasEnabled:        e.cfg.RecordCanvas,
		CanvasImageQuality:   e.cfg.CanvasQuality,
		CanvasFrameRate:      e.cfg.CanvasFps,
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

func (e *Router) getUXTestInfo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessInfo, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Get taskID
	vars := mux.Vars(r)
	id := vars["id"]

	// Get task info
	info, err := e.services.UXTesting.GetInfo(id)
	if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	sess, err := e.services.Sessions.Get(sessInfo.ID)
	if err != nil {
		ResponseWithError(w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		return
	}
	if sess.ProjectID != info.ProjectID {
		ResponseWithError(w, http.StatusForbidden, errors.New("project mismatch"), startTime, r.URL.Path, bodySize)
		return
	}
	type TaskInfoResponse struct {
		Task *uxtesting.UXTestInfo `json:"test"`
	}
	ResponseWithJSON(w, &TaskInfoResponse{Task: info}, startTime, r.URL.Path, bodySize)
}

func (e *Router) sendUXTestSignal(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
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
	req := &uxtesting.TestSignal{}

	if err := json.Unmarshal(bodyBytes, req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	req.SessionID = sessionData.ID

	// Save test signal
	if err := e.services.UXTesting.SetTestSignal(req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	ResponseOK(w, startTime, r.URL.Path, bodySize)
}

func (e *Router) sendUXTaskSignal(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
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
	req := &uxtesting.TaskSignal{}

	if err := json.Unmarshal(bodyBytes, req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	req.SessionID = sessionData.ID

	// Save test signal
	if err := e.services.UXTesting.SetTaskSignal(req); err != nil {
		ResponseWithError(w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	ResponseOK(w, startTime, r.URL.Path, bodySize)
}

func (e *Router) getUXUploadUrl(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	key := fmt.Sprintf("%d/ux_webcam_record.webm", sessionData.ID)
	url, err := e.services.ObjStorage.GetPreSignedUploadUrl(key)
	if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	type UrlResponse struct {
		URL string `json:"url"`
	}
	ResponseWithJSON(w, &UrlResponse{URL: url}, startTime, r.URL.Path, bodySize)
}

type ScreenshotMessage struct {
	Name string
	Data []byte
}

func (e *Router) imagesUploaderHandlerWeb(w http.ResponseWriter, r *http.Request) {
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

	// Parse the multipart form
	err = r.ParseMultipartForm(10 << 20) // Max upload size 10 MB
	if err == http.ErrNotMultipart || err == http.ErrMissingBoundary {
		ResponseWithError(w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
	} else if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0) // TODO: send error here only on staging
		return
	}

	// Iterate over uploaded files
	for _, fileHeaderList := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaderList {
			file, err := fileHeader.Open()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Read the file content
			fileBytes, err := ioutil.ReadAll(file)
			if err != nil {
				file.Close()
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			file.Close()

			fileName := util.SafeString(fileHeader.Filename)
			log.Printf("fileName: %s, fileSize: %d", fileName, len(fileBytes))

			// Create a message to send to Kafka
			msg := ScreenshotMessage{
				Name: fileName,
				Data: fileBytes,
			}
			data, err := json.Marshal(&msg)
			if err != nil {
				log.Printf("can't marshal screenshot message, err: %s", err)
				continue
			}

			// Send the message to queue
			if err := e.services.Producer.Produce(e.cfg.TopicCanvasImages, sessionData.ID, data); err != nil {
				log.Printf("failed to produce canvas image message: %v", err)
			}
		}
	}
	ResponseOK(w, startTime, r.URL.Path, 0)
}

func (e *Router) getTags(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}
	sessInfo, err := e.services.Sessions.Get(sessionData.ID)
	if err != nil {
		ResponseWithError(w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Get tags
	tags, err := e.services.Tags.Get(sessInfo.ProjectID)
	if err != nil {
		ResponseWithError(w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	type UrlResponse struct {
		Tags interface{} `json:"tags"`
	}
	ResponseWithJSON(w, &UrlResponse{Tags: tags}, startTime, r.URL.Path, bodySize)
}
