package accounts

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"

	config "openreplay/backend/internal/config/api"
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
	cfg      *config.Config
	service  Service
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, cfg *config.Config, req api.RequestHandler, service Service) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		cfg:     cfg,
		service: service,
	}
	h.handlers = append([]*api.Description{
		{"/account", "GET", req.Handle(h.getAccount), api.NoPermissions, api.DoNotTrack},
		{"/account", "POST", req.HandleWithBody(h.updateAccount), api.NoPermissions, "edit_account"},
		{"/account/scope", "POST", req.HandleWithBody(h.updateScope), api.NoPermissions, "change_scope"},
		{"/client/new_api_key", "POST", req.Handle(h.regenerateAPIKey), api.NoPermissions, "generate_new_tenant_token"},
		{"/config/weekly_report", "GET", req.Handle(h.getWeeklyReport), api.NoPermissions, api.DoNotTrack},
		{"/config/weekly_report", "POST", req.HandleWithBody(h.updateWeeklyReport), api.NoPermissions, "edit_weekly_report_config"},
		{"/users/modules", "POST", req.HandleWithBody(h.updateModule), api.NoPermissions, "update_user_module"},
	}, h.editionHandlers(req)...)
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) fail(r *api.RequestContext, action string, err error) (any, int, error) {
	switch {
	case errors.Is(err, ErrUserNotFound), errors.Is(err, ErrTenantNotFound):
		return nil, http.StatusNotFound, err
	case errors.Is(err, ErrUnauthorized):
		return nil, http.StatusUnauthorized, err
	}
	var invalid ValidationError
	if errors.As(err, &invalid) {
		return nil, http.StatusBadRequest, invalid.error
	}
	h.log.Error(r.Request.Context(), "failed to %s: %s", action, err)
	return nil, http.StatusInternalServerError, errInternal
}

func decode(r *api.RequestContext, dest any) error {
	if len(r.Body) == 0 {
		return nil
	}
	if err := json.Unmarshal(r.Body, dest); err != nil {
		return errInvalidBody
	}
	return nil
}

func (h *handlersImpl) getAccount(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	account, err := h.service.Get(r.Request.Context(), u.TenantID, u.ID)
	if err != nil {
		return h.fail(r, "get account", err)
	}
	return account, 0, nil
}

func (h *handlersImpl) updateAccount(r *api.RequestContext) (any, int, error) {
	req := &AccountRequest{}
	if err := decode(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Normalize(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	u := api.GetUser(r.Request)
	info, err := h.service.Update(r.Request.Context(), u.TenantID, u.ID, u.IsAdmin(), req)
	if err != nil {
		return h.fail(r, "update account", err)
	}
	return info, 0, nil
}

func decodeRequired(r *api.RequestContext, dest any) error {
	body := bytes.TrimSpace(r.Body)
	if len(body) == 0 || bytes.Equal(body, []byte("null")) {
		return errInvalidBody
	}
	return decode(r, dest)
}

func (h *handlersImpl) updateScope(r *api.RequestContext) (any, int, error) {
	if !api.GetUser(r.Request).IsAdmin() {
		return nil, http.StatusUnauthorized, errRoleRequired
	}
	req := &ScopeRequest{}
	if err := decodeRequired(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	scope, err := req.Value()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := h.service.UpdateScope(r.Request.Context(), api.GetUser(r.Request).TenantID, scope); err != nil {
		return h.fail(r, "update scope", err)
	}
	return scope, 0, nil
}

func (h *handlersImpl) regenerateAPIKey(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	if !u.IsAdmin() {
		return nil, http.StatusUnauthorized, errRoleRequired
	}
	key, err := h.service.RegenerateAPIKey(r.Request.Context(), u.TenantID)
	if err != nil {
		return h.fail(r, "regenerate api key", err)
	}
	h.log.Info(r.Request.Context(), "tenant api_key rotated tenant_id=%d user_id=%d", u.TenantID, u.ID)
	return key, 0, nil
}

func (h *handlersImpl) getWeeklyReport(r *api.RequestContext) (any, int, error) {
	u := api.GetUser(r.Request)
	res, err := h.service.GetWeeklyReport(r.Request.Context(), u.TenantID, u.ID)
	if err != nil {
		return h.fail(r, "get weekly report", err)
	}
	return res, 0, nil
}

func (h *handlersImpl) updateWeeklyReport(r *api.RequestContext) (any, int, error) {
	req := &WeeklyReportRequest{}
	if err := decodeRequired(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	enabled, err := req.Value()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	u := api.GetUser(r.Request)
	res, err := h.service.UpdateWeeklyReport(r.Request.Context(), u.TenantID, u.ID, enabled)
	if err != nil {
		return h.fail(r, "update weekly report", err)
	}
	return res, 0, nil
}

func (h *handlersImpl) updateModule(r *api.RequestContext) (any, int, error) {
	req := &ModuleRequest{}
	if err := decodeRequired(r, req); err != nil {
		return nil, http.StatusBadRequest, err
	}
	if err := req.Validate(); err != nil {
		return nil, http.StatusBadRequest, err
	}
	u := api.GetUser(r.Request)
	res, err := h.service.UpdateModule(r.Request.Context(), u.TenantID, u.ID, req.Module, *req.Status)
	if err != nil {
		return h.fail(r, "update module", err)
	}
	return res, 0, nil
}
