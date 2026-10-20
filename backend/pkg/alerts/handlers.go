package alerts

import (
	"encoding/json"
	"errors"
	"net/http"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log      logger.Logger
	service  Alerts
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, service Alerts) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		service: service,
	}
	h.handlers = []*api.Description{
		{"/{project}/alerts", "POST", req.HandleWithBody(h.createAlert), api.NoPermissions, "create_alert"},
		{"/{project}/alerts", "GET", req.Handle(h.getAlerts), api.NoPermissions, api.DoNotTrack},
		{"/{project}/alerts/triggers", "GET", req.Handle(h.getTriggers), api.NoPermissions, api.DoNotTrack},
		{"/{project}/alerts/{alertId}", "GET", req.Handle(h.getAlert), api.NoPermissions, api.DoNotTrack},
		{"/{project}/alerts/{alertId}", "POST", req.HandleWithBody(h.updateAlert), api.NoPermissions, "update_alert"},
		{"/{project}/alerts/{alertId}", "DELETE", req.Handle(h.deleteAlert), api.NoPermissions, "delete_alert"},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func parseRequest(body []byte) (*AlertRequest, error) {
	req := &AlertRequest{}
	if err := json.Unmarshal(body, req); err != nil {
		return nil, err
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}
	return req, nil
}

func pathIDs(r *api.RequestContext) (uint32, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		return 0, 0, err
	}
	alertID, err := api.GetPathParam(r.Request, "alertId", api.ParseInt32)
	if err != nil {
		return 0, 0, err
	}
	return projID, alertID, nil
}

func (h *handlersImpl) fail(r *api.RequestContext, err error, action string) (any, int, error) {
	switch {
	case errors.Is(err, ErrAlertNotFound):
		return nil, http.StatusNotFound, err
	case errors.Is(err, ErrInvalidSeries):
		return nil, http.StatusBadRequest, err
	}
	h.log.Error(r.Request.Context(), "failed to %s: %s", action, err)
	return nil, http.StatusInternalServerError, err
}

func (h *handlersImpl) createAlert(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req, err := parseRequest(r.Body)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	alert, err := h.service.Create(r.Request.Context(), projID, req)
	if err != nil {
		return h.fail(r, err, "create alert")
	}
	return alert, 0, nil
}

func (h *handlersImpl) getAlerts(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	list, err := h.service.GetAll(r.Request.Context(), projID)
	if err != nil {
		return h.fail(r, err, "list alerts")
	}
	return list, 0, nil
}

func (h *handlersImpl) getTriggers(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	triggers, err := h.service.GetTriggers(r.Request.Context(), projID, api.GetUser(r.Request).ID)
	if err != nil {
		return h.fail(r, err, "get alert triggers")
	}
	return triggers, 0, nil
}

func (h *handlersImpl) getAlert(r *api.RequestContext) (any, int, error) {
	projID, alertID, err := pathIDs(r)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	alert, err := h.service.Get(r.Request.Context(), projID, alertID)
	if err != nil {
		return h.fail(r, err, "get alert")
	}
	return alert, 0, nil
}

func (h *handlersImpl) updateAlert(r *api.RequestContext) (any, int, error) {
	projID, alertID, err := pathIDs(r)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	req, err := parseRequest(r.Body)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	alert, err := h.service.Update(r.Request.Context(), projID, alertID, req)
	if err != nil {
		return h.fail(r, err, "update alert")
	}
	return alert, 0, nil
}

func (h *handlersImpl) deleteAlert(r *api.RequestContext) (any, int, error) {
	projID, alertID, err := pathIDs(r)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	if err := h.service.Delete(r.Request.Context(), projID, alertID); err != nil {
		return h.fail(r, err, "delete alert")
	}
	return map[string]string{"state": "success"}, 0, nil
}
