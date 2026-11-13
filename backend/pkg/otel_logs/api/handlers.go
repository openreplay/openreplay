package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/otel_logs"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log      logger.Logger
	logs     otel_logs.Logs
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, logs otel_logs.Logs) (api.Handlers, error) {
	h := &handlersImpl{log: log, logs: logs}
	h.handlers = []*api.Description{
		{Path: "/{project}/logs/search", Method: "POST", Handler: req.HandleWithBody(h.search), Permissions: api.NoPermissions, AuditTrail: api.DoNotTrack},
		{Path: "/{project}/logs/histogram", Method: "POST", Handler: req.HandleWithBody(h.histogram), Permissions: api.NoPermissions, AuditTrail: api.DoNotTrack},
		{Path: "/{project}/logs/facets", Method: "POST", Handler: req.HandleWithBody(h.facets), Permissions: api.NoPermissions, AuditTrail: api.DoNotTrack},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

func (h *handlersImpl) search(ctx *api.RequestContext) (any, int, error) {
	req := &otel_logs.SearchRequest{}
	projectID, code, err := parse(ctx, req)
	if err != nil {
		return nil, code, err
	}
	resp, err := h.logs.Search(ctx.Request.Context(), projectID, req)
	return h.respond(ctx, resp, err)
}

func (h *handlersImpl) histogram(ctx *api.RequestContext) (any, int, error) {
	req := &otel_logs.Filter{}
	projectID, code, err := parse(ctx, req)
	if err != nil {
		return nil, code, err
	}
	resp, err := h.logs.Histogram(ctx.Request.Context(), projectID, req)
	return h.respond(ctx, resp, err)
}

func (h *handlersImpl) facets(ctx *api.RequestContext) (any, int, error) {
	req := &otel_logs.FacetsRequest{}
	projectID, code, err := parse(ctx, req)
	if err != nil {
		return nil, code, err
	}
	resp, err := h.logs.Facets(ctx.Request.Context(), projectID, req)
	return h.respond(ctx, resp, err)
}

func parse(ctx *api.RequestContext, req any) (uint32, int, error) {
	projectID, err := ctx.GetProjectID()
	if err != nil {
		return 0, http.StatusBadRequest, err
	}
	if err := json.Unmarshal(ctx.Body, req); err != nil {
		return 0, http.StatusBadRequest, fmt.Errorf("invalid request body: %w", err)
	}
	return projectID, 0, nil
}

func (h *handlersImpl) respond(ctx *api.RequestContext, resp any, err error) (any, int, error) {
	switch {
	case err == nil:
		return resp, http.StatusOK, nil
	case otel_logs.IsValidationError(err):
		return nil, http.StatusBadRequest, err
	case errors.Is(err, otel_logs.ErrTimeout):
		return nil, http.StatusRequestTimeout, err
	default:
		h.log.Error(ctx.Request.Context(), "otel logs query failed: %s", err)
		return nil, http.StatusInternalServerError, errors.New("failed to query logs")
	}
}
