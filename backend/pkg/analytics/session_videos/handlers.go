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

const (
	DefaultPage  = 1
	DefaultLimit = 10
)

type RequestContext struct {
	StartTime time.Time
	BodySize  int
	Path      string
}

type handlersImpl struct {
	log           logger.Logger
	responser     *api.Responser
	jsonSizeLimit int64
	sessionVideos SessionVideos
	validator     *validator.Validate
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

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{projectId}/session-videos", "POST", e.exportSessionVideo, []string{"SESSION_EXPORT"}, api.DoNotTrack},
		{"/v1/{projectId}/session-videos", "GET", e.getSessionVideos, []string{"SESSION_EXPORT"}, api.DoNotTrack},
		{"/v1/{projectId}/session-videos/{sessionId}", "DELETE", e.deleteSessionVideo, []string{"SESSION_EXPORT"}, api.DoNotTrack},
		{"/v1/{projectId}/session-videos/{sessionId}", "GET", e.downloadSessionVideo, []string{"SESSION_EXPORT"}, api.DoNotTrack},
	}
}

func (e *handlersImpl) initRequestContext(r *http.Request) *RequestContext {
	return &RequestContext{
		StartTime: time.Now(),
		BodySize:  0,
		Path:      r.URL.Path,
	}
}

func (e *handlersImpl) handleError(ctx *RequestContext, w http.ResponseWriter, r *http.Request, statusCode int, err error) {
	e.responser.ResponseWithError(e.log, r.Context(), w, statusCode, err, ctx.StartTime, ctx.Path, ctx.BodySize)
}

func (e *handlersImpl) handleSuccess(ctx *RequestContext, w http.ResponseWriter, r *http.Request, data interface{}) {
	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": data}, ctx.StartTime, ctx.Path, ctx.BodySize)
}

func (e *handlersImpl) getIDFromRequest(r *http.Request, key string) (int, error) {
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

func (e *handlersImpl) getStringFromRequest(r *http.Request, key string) (string, error) {
	vars := mux.Vars(r)
	value := vars[key]
	if value == "" {
		return "", fmt.Errorf("missing %s in request", key)
	}
	return value, nil
}

func (e *handlersImpl) getCurrentUser(r *http.Request) *user.User {
	return r.Context().Value("userData").(*user.User)
}

func (e *handlersImpl) parseJSONBody(ctx *RequestContext, w http.ResponseWriter, r *http.Request, dest interface{}) error {
	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.handleError(ctx, w, r, http.StatusRequestEntityTooLarge, err)
		return err
	}
	ctx.BodySize = len(bodyBytes)

	if err := json.Unmarshal(bodyBytes, dest); err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return err
	}

	if err := e.validator.Struct(dest); err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return err
	}

	return nil
}

func (e *handlersImpl) parseIntQueryParam(r *http.Request, key string, defaultValue int) int {
	valueStr := r.URL.Query().Get(key)
	if valueStr == "" {
		return defaultValue
	}

	if value, err := strconv.Atoi(valueStr); err == nil && value > 0 {
		return value
	}

	return defaultValue
}

func (e *handlersImpl) parseBoolQueryParam(r *http.Request, key string, defaultValue bool) bool {
	valueStr := r.URL.Query().Get(key)
	if valueStr == "" {
		return defaultValue
	}

	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}

	return defaultValue
}

func (e *handlersImpl) parseStatusQueryParam(r *http.Request) Status {
	statusStr := r.URL.Query().Get("status")
	if statusStr != "" {
		return Status(statusStr)
	}
	return StatusCompleted
}

func (e *handlersImpl) exportSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := e.initRequestContext(r)

	var req SessionVideoExportRequest
	if err := e.parseJSONBody(ctx, w, r, &req); err != nil {
		return
	}

	projectID, err := e.getIDFromRequest(r, "projectId")
	if err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return
	}

	currentUser := e.getCurrentUser(r)
	resp, err := e.sessionVideos.ExportSessionVideo(projectID, currentUser.ID, currentUser.TenantID, &req)
	if err != nil {
		e.handleError(ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	e.handleSuccess(ctx, w, r, resp)
}

func (e *handlersImpl) getSessionVideos(w http.ResponseWriter, r *http.Request) {
	ctx := e.initRequestContext(r)

	projectID, err := e.getIDFromRequest(r, "projectId")
	if err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return
	}

	req := &SessionVideosGetRequest{
		PageInfo: PageInfo{
			Page:  e.parseIntQueryParam(r, "page", DefaultPage),
			Limit: e.parseIntQueryParam(r, "limit", DefaultLimit),
		},
		IsSelf: e.parseBoolQueryParam(r, "isSelf", false),
		Status: e.parseStatusQueryParam(r),
	}

	currentUser := e.getCurrentUser(r)
	resp, err := e.sessionVideos.GetAll(projectID, currentUser.ID, req)
	if err != nil {
		e.handleError(ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	e.handleSuccess(ctx, w, r, resp)
}

func (e *handlersImpl) deleteSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := e.initRequestContext(r)

	projectID, err := e.getIDFromRequest(r, "projectId")
	if err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return
	}

	sessionID, err := e.getStringFromRequest(r, "sessionId")
	if err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return
	}

	currentUser := e.getCurrentUser(r)
	resp, err := e.sessionVideos.DeleteSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		e.handleError(ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	e.handleSuccess(ctx, w, r, resp)
}

func (e *handlersImpl) downloadSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := e.initRequestContext(r)

	projectID, err := e.getIDFromRequest(r, "projectId")
	if err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return
	}

	sessionID, err := e.getStringFromRequest(r, "sessionId")
	if err != nil {
		e.handleError(ctx, w, r, http.StatusBadRequest, err)
		return
	}

	currentUser := e.getCurrentUser(r)
	url, err := e.sessionVideos.DownloadSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		e.handleError(ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	e.handleSuccess(ctx, w, r, url)
}
