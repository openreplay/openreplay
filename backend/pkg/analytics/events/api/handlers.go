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
	log      logger.Logger
	events   events.Events
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, events events.Events) (api.Handlers, error) {
	h := &handlersImpl{
		log:    log,
		events: events,
	}
	h.handlers = []*api.Description{
		{"/{project}/events", "POST", req.HandleWithBody(h.eventsSearch), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/events/{eventId}", "GET", req.Handle(h.getEvent), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
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
func (h *handlersImpl) eventsSearch(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	req := &model.EventsSearchRequest{}
	if err := json.Unmarshal(r.Body, req); err != nil {
		h.log.Error(r.Request.Context(), "failed to unmarshal search request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if err := filters.ValidateStruct(req); err != nil {
		h.log.Error(r.Request.Context(), "validation failed for search request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	response, err := h.events.SearchEvents(r.Request.Context(), projID, req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to search events for project %d: %v", projID, err)
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
func (h *handlersImpl) getEvent(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	eventID, err := api.GetPathParam(r.Request, "eventId", api.ParseString)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get eventId parameter: %v", err)
		return nil, http.StatusBadRequest, err
	}

	response, err := h.events.GetEventByID(r.Request.Context(), projID, eventID)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get event %s for project %d: %v", eventID, projID, err)
		return nil, http.StatusNotFound, err
	}

	return response, 0, nil
}
