package mobile

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
	gzip "github.com/klauspost/pgzip"

	httpCfg "openreplay/backend/internal/config/http"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/ios"
	"openreplay/backend/internal/http/uaparser"
	"openreplay/backend/internal/http/uuid"
	"openreplay/backend/pkg/conditions"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/token"
)

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

type handlersImpl struct {
	log        logger.Logger
	cfg        *httpCfg.Config
	responser  *api.Responser
	producer   types.Producer
	projects   projects.Projects
	sessions   sessions.Sessions
	uaParser   *uaparser.UAParser
	geoIP      geoip.GeoParser
	tokenizer  *token.Tokenizer
	conditions conditions.Conditions
	flaker     *flakeid.Flaker
	features   map[string]bool
}

func NewHandlers(cfg *httpCfg.Config, log logger.Logger, responser *api.Responser, producer types.Producer, projects projects.Projects,
	sessions sessions.Sessions, uaParser *uaparser.UAParser, geoIP geoip.GeoParser, tokenizer *token.Tokenizer,
	conditions conditions.Conditions, flaker *flakeid.Flaker) (api.Handlers, error) {
	return &handlersImpl{
		log:        log,
		cfg:        cfg,
		responser:  responser,
		producer:   producer,
		projects:   projects,
		sessions:   sessions,
		uaParser:   uaParser,
		geoIP:      geoIP,
		tokenizer:  tokenizer,
		conditions: conditions,
		flaker:     flaker,
		features: map[string]bool{
			"feature-flags":  cfg.IsFeatureFlagEnabled,
			"usability-test": cfg.IsUsabilityTestEnabled,
		},
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/mobile/start", e.startMobileSessionHandler, "POST"},
		{"/v1/mobile/i", e.pushMobileMessagesHandler, "POST"},
		{"/v1/mobile/late", e.pushMobileLateMessagesHandler, "POST"},
		{"/v1/mobile/images", e.mobileImagesUploadHandler, "POST"},
	}
}

func (e *handlersImpl) startMobileSessionHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	if r.Body == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, 0)
		return
	}
	body := http.MaxBytesReader(w, r.Body, e.cfg.JsonSizeLimit)
	defer body.Close()

	req := &StartMobileSessionRequest{}
	if err := json.NewDecoder(body).Decode(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, 0)
		return
	}

	// Add tracker version to context
	r = r.WithContext(context.WithValue(r.Context(), "tracker", req.TrackerVersion))

	if req.ProjectKey == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, errors.New("projectKey value required"), startTime, r.URL.Path, 0)
		return
	}

	p, err := e.projects.GetProjectByKey(*req.ProjectKey)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			logErr := fmt.Errorf("project doesn't exist or is not active, key: %s", *req.ProjectKey)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, logErr, startTime, r.URL.Path, 0)
		} else {
			e.log.Error(r.Context(), "failed to get project by key: %s, err: %s", *req.ProjectKey, err)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("can't find a project"), startTime, r.URL.Path, 0)
		}
		return
	}

	// Add projectID to context
	r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", p.ProjectID)))

	// Check if the project supports mobile sessions
	if !p.IsMobile() {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, errors.New("project doesn't support mobile sessions"), startTime, r.URL.Path, 0)
		return
	}

	if !checkMobileTrackerVersion(req.TrackerVersion) {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUpgradeRequired, errors.New("tracker version not supported"), startTime, r.URL.Path, 0)
		return
	}

	userUUID := uuid.GetUUID(req.UserUUID)
	tokenData, err := e.tokenizer.Parse(req.Token)

	if err != nil { // Starting the new one
		dice := byte(rand.Intn(100)) // [0, 100)
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
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, fmt.Errorf("capture rate miss, rate: %d", p.SampleRate), startTime, r.URL.Path, 0)
			return
		}

		ua := e.uaParser.ParseFromHTTPRequest(r)
		if ua == nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, fmt.Errorf("browser not recognized, user-agent: %s", r.Header.Get("User-Agent")), startTime, r.URL.Path, 0)
			return
		}
		sessionID, err := e.flaker.Compose(uint64(startTime.UnixMilli()))
		if err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
			return
		}

		expTime := startTime.Add(time.Duration(p.MaxSessionDuration) * time.Millisecond)
		tokenData = &token.TokenData{sessionID, 0, expTime.UnixMilli()}

		// Add sessionID to context
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionID)))

		geoInfo := e.geoIP.ExtractGeoData(r)
		deviceType, platform, os := ios.GetIOSDeviceType(req.UserDevice), "ios", "IOS"
		if req.Platform != "" && req.Platform != "ios" {
			deviceType = req.UserDeviceType
			platform = req.Platform
			os = "Android"
		}

		if !req.DoNotRecord {
			if err := e.sessions.Add(&sessions.Session{
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
				UserDeviceType:       deviceType,
				UserCountry:          geoInfo.Country,
				UserState:            geoInfo.State,
				UserCity:             geoInfo.City,
				UserDeviceMemorySize: req.DeviceMemory,
				UserDeviceHeapSize:   req.DeviceMemory,
				ScreenWidth:          req.Width,
				ScreenHeight:         req.Height,
			}); err != nil {
				e.log.Warn(r.Context(), "failed to add mobile session to DB: %s", err)
			}

			sessStart := &messages.MobileSessionStart{
				Timestamp:      req.Timestamp,
				ProjectID:      uint64(p.ProjectID),
				TrackerVersion: req.TrackerVersion,
				RevID:          req.RevID,
				UserUUID:       userUUID,
				UserOS:         os,
				UserOSVersion:  req.UserOSVersion,
				UserDevice:     ios.MapIOSDevice(req.UserDevice),
				UserDeviceType: deviceType,
				UserCountry:    geoInfo.Pack(),
			}

			if err := e.producer.Produce(e.cfg.TopicRawMobile, tokenData.ID, sessStart.Encode()); err != nil {
				e.log.Error(r.Context(), "failed to send mobile sessionStart event to queue: %s", err)
			}
		}
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, &StartMobileSessionResponse{
		Token:           e.tokenizer.Compose(*tokenData),
		UserUUID:        userUUID,
		SessionID:       strconv.FormatUint(tokenData.ID, 10),
		BeaconSizeLimit: e.cfg.BeaconSizeLimit,
		ImageQuality:    e.cfg.MobileQuality,
		FrameRate:       e.cfg.MobileFps,
		ProjectID:       strconv.FormatUint(uint64(p.ProjectID), 10),
		Features:        e.features,
	}, startTime, r.URL.Path, 0)
}

func (e *handlersImpl) pushMobileMessagesHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}

	// Add sessionID and projectID to context
	if info, err := e.sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	e.pushMessages(w, r, sessionData.ID, e.cfg.TopicRawMobile)
}

func (e *handlersImpl) pushMobileLateMessagesHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}

	if err != nil && err != token.EXPIRED {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, 0)
		return
	}
	// Check timestamps here?
	e.pushMessages(w, r, sessionData.ID, e.cfg.TopicRawMobile)
}

func (e *handlersImpl) mobileImagesUploadHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
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

	err = r.ParseMultipartForm(5 * 1e6) // ~5Mb
	if err == http.ErrNotMultipart || err == http.ErrMissingBoundary {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnsupportedMediaType, err, startTime, r.URL.Path, 0)
		return
	} else if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0) // TODO: send error here only on staging
		return
	}

	if r.MultipartForm == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, errors.New("multipart not parsed"), startTime, r.URL.Path, 0)
		return
	}

	if len(r.MultipartForm.Value["projectKey"]) == 0 {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("projectKey parameter missing"), startTime, r.URL.Path, 0) // status for missing/wrong parameter?
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
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, 0)
				return
			}
			file.Close()

			if err := e.producer.Produce(e.cfg.TopicRawImages, sessionData.ID, data); err != nil {
				e.log.Warn(r.Context(), "failed to send image to queue: %s", err)
			}
		}
	}
	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, 0)
}

func (e *handlersImpl) pushMessages(w http.ResponseWriter, r *http.Request, sessionID uint64, topicName string) {
	start := time.Now()
	body := http.MaxBytesReader(w, r.Body, e.cfg.BeaconSizeLimit)
	defer body.Close()

	var reader io.ReadCloser
	var err error

	switch r.Header.Get("Content-Encoding") {
	case "gzip":
		reader, err = gzip.NewReader(body)
		if err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, start, r.URL.Path, 0)
			return
		}
		defer reader.Close()
	default:
		reader = body
	}
	buf, err := io.ReadAll(reader)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, start, r.URL.Path, 0)
		return
	}
	if err := e.producer.Produce(topicName, sessionID, buf); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, start, r.URL.Path, 0)
		return
	}
	w.WriteHeader(http.StatusOK)
	e.log.Info(r.Context(), "response ok")
}
