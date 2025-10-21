package api

import (
	"errors"
	"net/http"
	"openreplay/backend/pkg/sessions"

	"github.com/go-playground/validator/v10"

	config "openreplay/backend/internal/config/videoreplays"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/videoreplays/service"
)

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	validator     *validator.Validate
	sessionVideos service.SessionVideos
	sessions      sessions.Sessions
	jsonSizeLimit int64
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser api.Responser, sessions sessions.Sessions, sessionVideos service.SessionVideos, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		sessionVideos: sessionVideos,
		sessions:      sessions,
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

func (e *handlersImpl) exportSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := InitRequestContext(r)

	var req service.SessionVideoExportRequest
	if err := ParseJSONBody(e.log, e.responser, e.validator, ctx, w, r, e.jsonSizeLimit, &req); err != nil {
		return
	}

	projectID, err := GetIDFromRequest(r, "projectId")
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	if !e.sessions.IsExist(projectID, req.SessionID) {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusNotFound, errors.New("session does not exist"))
		return
	}

	currentUser := GetCurrentUser(r)
	resp, err := e.sessionVideos.ExportSessionVideo(projectID, currentUser.ID, currentUser.TenantID, &req)
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	HandleSuccess(e.log, e.responser, ctx, w, r, resp)
}

func (e *handlersImpl) getSessionVideos(w http.ResponseWriter, r *http.Request) {
	ctx := InitRequestContext(r)

	projectID, err := GetIDFromRequest(r, "projectId")
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	req := &service.SessionVideosGetRequest{
		PageInfo: service.PageInfo{
			Page:  ParseIntQueryParam(r, "page", DefaultPage),
			Limit: ParseIntQueryParam(r, "limit", DefaultLimit),
		},
		IsSelf: ParseBoolQueryParam(r, "isSelf", false),
		Status: service.Status(ParseStatusQueryParam(r, string(service.StatusCompleted))),
	}

	currentUser := GetCurrentUser(r)
	resp, err := e.sessionVideos.GetAll(projectID, currentUser.ID, req)
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	HandleSuccess(e.log, e.responser, ctx, w, r, resp)
}

func (e *handlersImpl) deleteSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := InitRequestContext(r)

	projectID, err := GetIDFromRequest(r, "projectId")
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	sessionID, err := GetStringFromRequest(r, "sessionId")
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}
	if !e.sessions.IsExist(projectID, sessionID) {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusNotFound, errors.New("session does not exist"))
		return
	}

	currentUser := GetCurrentUser(r)
	resp, err := e.sessionVideos.DeleteSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	HandleSuccess(e.log, e.responser, ctx, w, r, resp)
}

func (e *handlersImpl) downloadSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := InitRequestContext(r)

	projectID, err := GetIDFromRequest(r, "projectId")
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	sessionID, err := GetStringFromRequest(r, "sessionId")
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}
	if !e.sessions.IsExist(projectID, sessionID) {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusNotFound, errors.New("session does not exist"))
		return
	}

	currentUser := GetCurrentUser(r)
	url, err := e.sessionVideos.DownloadSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	HandleSuccess(e.log, e.responser, ctx, w, r, url)
}
