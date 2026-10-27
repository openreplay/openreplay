package trails

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

var (
	errRoleRequired = errors.New("You need a different role to access this resource")
	errInternal     = errors.New("internal server error")
	errInvalidBody  = errors.New("invalid request body")
)

type handlersImpl struct {
	log      logger.Logger
	service  Trails
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, service Trails) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		service: service,
	}
	h.handlers = []*api.Description{
		{"/trails", "POST", req.HandleWithBody(h.searchTrails), api.NoPermissions, "get_trails"},
		{"/trails/actions", "POST", req.Handle(h.listActions), api.NoPermissions, "get_available_trail_actions"},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) searchTrails(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	if !u.IsAdmin() {
		return nil, http.StatusUnauthorized, errRoleRequired
	}
	req := &SearchRequest{}
	if len(r.Body) > 0 {
		if err := json.Unmarshal(r.Body, req); err != nil {
			return nil, http.StatusBadRequest, errInvalidBody
		}
	}
	p, err := req.params(time.Now())
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	res, err := h.service.Search(r.Request.Context(), u.TenantID, p)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to search trails: %s", err)
		return nil, http.StatusInternalServerError, errInternal
	}
	return res, 0, nil
}

func (h *handlersImpl) listActions(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	if !u.IsAdmin() {
		return nil, http.StatusUnauthorized, errRoleRequired
	}
	actions, err := h.service.Actions(r.Request.Context(), u.TenantID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to list trail actions: %s", err)
		return nil, http.StatusInternalServerError, errInternal
	}
	return actions, 0, nil
}
