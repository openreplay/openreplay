package session_videos

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

func getIDFromRequest(r *http.Request, key string) (int, error) {
	vars := mux.Vars(r)
	idStr := vars[key]
	if idStr == "" {
		return 0, fmt.Errorf("missing %s in request", key)
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, fmt.Errorf("invalid %s format", key)
	}

	return id, nil
}

type handlersImpl struct {
	log           logger.Logger
	responser     *api.Responser
	jsonSizeLimit int64
	sessionVideos SessionVideos
	validator     *validator.Validate
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{projectId}/session-videos", "POST", e.exportSessionVideo, []string{"SESSION_EXPORT"}, api.DoNotTrack},
		{"/v1/{projectId}/session-videos", "GET", e.getSessionVideos, []string{"SESSION_EXPORT"}, api.DoNotTrack},
		{"/v1/{projectId}/session-videos/{sessionId}", "DELETE", e.deleteSessionVideo, []string{"SESSION_EXPORT"}, api.DoNotTrack},
		{"/v1/{projectId}/session-videos/{sessionId}", "GET", e.downloadSessionVideo, []string{"SESSION_EXPORT"}, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser *api.Responser, sessionVideos SessionVideos, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		sessionVideos: sessionVideos,
		validator:     validator,
	}, nil
}

func (e *handlersImpl) exportSessionVideo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &SessionVideoExportRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err = e.validator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.sessionVideos.ExportSessionVideo(projectID, currentUser.ID, currentUser.TenantID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getSessionVideos(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Parse query parameters with defaults
	page := 1
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	isSelf := false
	if isSelfStr := r.URL.Query().Get("isSelf"); isSelfStr != "" {
		if is, err := strconv.ParseBool(isSelfStr); err == nil {
			isSelf = is
		}
	}

	statusStr := r.URL.Query().Get("status")
	var status Status
	if statusStr != "" {
		status = Status(statusStr)
	} else {
		status = StatusCompleted
	}

	req := &SessionVideosGetRequest{
		PageInfo: PageInfo{
			Page:  page,
			Limit: limit,
		},
		IsSelf: isSelf,
		Status: status,
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.sessionVideos.GetAll(projectID, currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) deleteSessionVideo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0
	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	sessionID := mux.Vars(r)["sessionId"]
	if sessionID == "" {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("missing sessionId in request"), startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.sessionVideos.DeleteSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) downloadSessionVideo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0
	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	sessionID := mux.Vars(r)["sessionId"]
	if sessionID == "" {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("missing sessionId in request"), startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	url, err := e.sessionVideos.DownloadSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": url}, startTime, r.URL.Path, bodySize)
}
