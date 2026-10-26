package webhooks

import (
	"encoding/json"
	"errors"
	"net/http"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

var (
	errInternal    = errors.New("internal server error")
	errInvalidBody = errors.New("invalid request body")
)

type handlersImpl struct {
	log      logger.Logger
	service  Webhooks
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, service Webhooks) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		service: service,
	}
	h.handlers = []*api.Description{
		{"/webhooks", "GET", req.Handle(h.listWebhooks), api.NoPermissions, api.DoNotTrack},
		{"/webhooks", "PUT", req.HandleWithBody(h.saveWebhook), api.NoPermissions, "add_edit_webhook"},
		{"/webhooks/{webhookId}", "DELETE", req.Handle(h.deleteWebhook), api.NoPermissions, "delete_webhook"},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) fail(r *api.RequestContext, action string, err error) (any, int, error) {
	switch {
	case errors.Is(err, ErrWebhookNotFound):
		return nil, http.StatusNotFound, err
	case errors.Is(err, ErrNameExists):
		return nil, http.StatusBadRequest, err
	}
	h.log.Error(r.Request.Context(), "failed to %s: %s", action, err)
	return nil, http.StatusInternalServerError, errInternal
}

func (h *handlersImpl) listWebhooks(r *api.RequestContext) (any, int, error) {
	list, err := h.service.List(r.Request.Context(), api.GetUser(r.Request).TenantID)
	if err != nil {
		return h.fail(r, "list webhooks", err)
	}
	return list, 0, nil
}

func (h *handlersImpl) saveWebhook(r *api.RequestContext) (any, int, error) {
	req := &WebhookRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, errInvalidBody
	}
	if err := req.Normalize(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	w, err := h.service.Save(r.Request.Context(), api.GetUser(r.Request).TenantID, req)
	if err != nil {
		return h.fail(r, "save webhook", err)
	}
	return w, 0, nil
}

func (h *handlersImpl) deleteWebhook(r *api.RequestContext) (any, int, error) {
	webhookID, err := api.GetPathParam(r.Request, "webhookId", api.ParseInt)
	if err != nil || webhookID <= 0 {
		return nil, http.StatusBadRequest, errors.New("invalid webhook id")
	}
	if err := h.service.Delete(r.Request.Context(), api.GetUser(r.Request).TenantID, int64(webhookID)); err != nil {
		return h.fail(r, "delete webhook", err)
	}
	return map[string]string{"state": "success"}, 0, nil
}
