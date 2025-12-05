package api

import (
	"encoding/json"
	"net/http"

	"openreplay/backend/pkg/analytics/events"
	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

// @title OpenReplay Analytics API
// @version 1.0
// @description API for product analytics - events and users management, querying, and filtering
// @BasePath /api/v1

type handlersImpl struct {
	*api.BaseHandler
	events events.Events
}

func NewHandlers(log logger.Logger, jsonSizeLimit int64, events events.Events, responser api.Responser) (api.Handlers, error) {
	return &handlersImpl{
		BaseHandler: api.NewBaseHandler(log, responser, jsonSizeLimit),
		events:      events,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{
			Path:        "/{project}/events",
			Method:      "POST",
			Handler:     api.AutoRespondContextWithBody(h, h.eventsSearch),
			Permissions: []string{"DATA_MANAGEMENT"},
			AuditTrail:  "",
		},
		{
			Path:        "/{project}/events/{eventId}",
			Method:      "GET",
			Handler:     api.AutoRespondContext(h, h.getEvent),
			Permissions: []string{"DATA_MANAGEMENT"},
			AuditTrail:  "",
		},
	}
}

// @Summary Search Events
// @Description Search and filter events based on various criteria. Supports filtering, date range selection, sorting, pagination, and column selection. Valid values for sortBy and columns are any EventEntry field names. Filter operators: is, isAny, isNot, isUndefined, contains, notContains, startsWith, endsWith (strings); =, <, >, <=, >=, != (numbers/dates).
// @Tags Analytics - Events
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param eventsSearchRequest body model.EventsSearchRequest true "Events Search Request"
// @Success 200 {object} model.EventsSearchResponse
// @Failure 400 {object} api.ErrorResponse
// @Failure 413 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/events [post]
func (h *handlersImpl) eventsSearch(r *api.RequestContext) (*model.EventsSearchResponse, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.Log().Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	req := &model.EventsSearchRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		return nil, http.StatusBadRequest, err
	}

	if err := filters.ValidateStruct(req); err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.events.SearchEvents(projID, req)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	return response, 0, nil
}

// @Summary Get Event by ID
// @Description Retrieve a specific event by its event ID with all event properties and metadata.
// @Tags Analytics - Events
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param eventId path string true "Event ID"
// @Success 200 {object} model.EventEntry
// @Failure 400 {object} api.ErrorResponse
// @Failure 404 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/events/{eventId} [get]
func (h *handlersImpl) getEvent(r *api.RequestContext) (*model.EventEntry, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	eventID, err := api.GetPathParam(r.Request, "eventId", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.events.GetEventByID(projID, eventID)
	if err != nil {
		return nil, http.StatusNotFound, err
	}

	return response, 0, nil
}
