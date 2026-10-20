package notifications

import (
	"encoding/json"
	"net/http"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log      logger.Logger
	service  Notifications
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, service Notifications) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		service: service,
	}
	h.handlers = []*api.Description{
		{"/notifications", "GET", req.Handle(h.getNotifications), api.NoPermissions, api.DoNotTrack},
		{"/notifications/count", "GET", req.Handle(h.getCount), api.NoPermissions, api.DoNotTrack},
		{"/notifications/{notificationId}/view", "GET", req.Handle(h.viewNotification), api.NoPermissions, api.DoNotTrack},
		{"/notifications/view", "POST", req.HandleWithBody(h.viewNotifications), api.NoPermissions, api.DoNotTrack},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) getNotifications(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	list, err := h.service.GetAll(r.Request.Context(), u.TenantID, u.ID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to list notifications: %s", err)
		return nil, http.StatusInternalServerError, err
	}
	return list, 0, nil
}

func (h *handlersImpl) getCount(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	count, err := h.service.Count(r.Request.Context(), u.TenantID, u.ID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to count notifications: %s", err)
		return nil, http.StatusInternalServerError, err
	}
	return count, 0, nil
}

func (h *handlersImpl) viewNotification(r *api.RequestContext) (any, int, error) {
	notificationID, err := api.GetPathParam(r.Request, "notificationId", api.ParseInt32)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	return h.view(r, &ViewRequest{IDs: []int{notificationID}})
}

func (h *handlersImpl) viewNotifications(r *api.RequestContext) (any, int, error) {
	req := &ViewRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Normalize(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	return h.view(r, req)
}

func (h *handlersImpl) view(r *api.RequestContext, req *ViewRequest) (any, int, error) {
	u := api.GetUser(r.Request)
	ok, err := h.service.View(r.Request.Context(), u.TenantID, u.ID, req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to mark notifications as viewed: %s", err)
		return nil, http.StatusInternalServerError, err
	}
	return ok, 0, nil
}
