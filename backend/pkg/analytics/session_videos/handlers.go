package session_videos

import (
	"net/http"

	"github.com/go-playground/validator/v10"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/utils"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

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

func (e *handlersImpl) exportSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := utils.InitRequestContext(r)

	var req SessionVideoExportRequest
	if err := utils.ParseJSONBody(e.log, e.responser, e.validator, ctx, w, r, e.jsonSizeLimit, &req); err != nil {
		return
	}

	projectID, err := utils.GetIDFromRequest(r, "projectId")
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	currentUser := utils.GetCurrentUser(r)
	resp, err := e.sessionVideos.ExportSessionVideo(projectID, currentUser.ID, currentUser.TenantID, &req)
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	utils.HandleSuccess(e.log, e.responser, ctx, w, r, resp)
}

func (e *handlersImpl) getSessionVideos(w http.ResponseWriter, r *http.Request) {
	ctx := utils.InitRequestContext(r)

	projectID, err := utils.GetIDFromRequest(r, "projectId")
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	req := &SessionVideosGetRequest{
		PageInfo: PageInfo{
			Page:  utils.ParseIntQueryParam(r, "page", utils.DefaultPage),
			Limit: utils.ParseIntQueryParam(r, "limit", utils.DefaultLimit),
		},
		IsSelf: utils.ParseBoolQueryParam(r, "isSelf", false),
		Status: Status(utils.ParseStatusQueryParam(r, string(StatusCompleted))),
	}

	currentUser := utils.GetCurrentUser(r)
	resp, err := e.sessionVideos.GetAll(projectID, currentUser.ID, req)
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	utils.HandleSuccess(e.log, e.responser, ctx, w, r, resp)
}

func (e *handlersImpl) deleteSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := utils.InitRequestContext(r)

	projectID, err := utils.GetIDFromRequest(r, "projectId")
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	sessionID, err := utils.GetStringFromRequest(r, "sessionId")
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	currentUser := utils.GetCurrentUser(r)
	resp, err := e.sessionVideos.DeleteSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	utils.HandleSuccess(e.log, e.responser, ctx, w, r, resp)
}

func (e *handlersImpl) downloadSessionVideo(w http.ResponseWriter, r *http.Request) {
	ctx := utils.InitRequestContext(r)

	projectID, err := utils.GetIDFromRequest(r, "projectId")
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	sessionID, err := utils.GetStringFromRequest(r, "sessionId")
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusBadRequest, err)
		return
	}

	currentUser := utils.GetCurrentUser(r)
	url, err := e.sessionVideos.DownloadSessionVideo(projectID, currentUser.ID, sessionID)
	if err != nil {
		utils.HandleError(e.log, e.responser, ctx, w, r, http.StatusInternalServerError, err)
		return
	}

	utils.HandleSuccess(e.log, e.responser, ctx, w, r, url)
}
