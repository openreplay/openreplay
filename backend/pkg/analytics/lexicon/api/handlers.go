package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/lexicon"
	"openreplay/backend/pkg/analytics/lexicon/model"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

// @title OpenReplay Analytics API
// @version 1.0
// @description API for product analytics - lexicon data management and retrieval
// @BasePath /api/v1

type handlersImpl struct {
	log      logger.Logger
	lexicon  lexicon.Lexicon
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, lexicon lexicon.Lexicon) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		lexicon: lexicon,
	}
	h.handlers = []*api.Description{
		{"/{project}/lexicon/events", "GET", req.Handle(h.getDistinctEvents), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
		{"/{project}/lexicon/properties", "GET", req.Handle(h.getProperties), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
		{"/{project}/lexicon/events", "PUT", req.HandleWithBody(h.updateEvent), []string{api.DATA_MANAGEMENT}, "update_event"},
		{"/{project}/lexicon/properties", "PUT", req.HandleWithBody(h.updateProperty), []string{api.DATA_MANAGEMENT}, "update_property"},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return h.handlers
}

// @Summary Get Distinct Events
// @Description Retrieve a list of distinct events.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param propertyName query string false "Property name filter"
// @Success 200 {object} model.LexiconEventsResponse
// @Failure 400 {object} api.ErrorResponse
// @Failure 413 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/lexicon/events [get]
func (h *handlersImpl) getDistinctEvents(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var propertyName *string
	if propertyNameParam := r.Request.URL.Query().Get("propertyName"); propertyNameParam != "" {
		propertyName = &propertyNameParam
	}

	events, total, err := h.lexicon.GetDistinctEvents(r.Request.Context(), projID, propertyName)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get events for project %d: %v", projID, err)
		return nil, http.StatusInternalServerError, err
	}

	response := &model.LexiconEventsResponse{
		Events: events,
		Total:  total,
	}

	return response, 0, nil
}

// @Summary Get Properties
// @Description Retrieve a list of properties with pagination support.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param source query string false "Source filter (events, users, or sessions)"
// @Param eventName query string false "Event name filter"
// @Param limit query int false "Number of properties to return (default 500, max 500)"
// @Param page query int false "Page number for pagination (default 1)"
// @Success 200 {object} model.LexiconPropertiesResponse
// @Failure 400 {object} api.ErrorResponse
// @Failure 413 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/lexicon/properties [get]
func (h *handlersImpl) getProperties(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var source *string
	if sourceParam := r.Request.URL.Query().Get("source"); sourceParam != "" {
		if sourceParam == "events" || sourceParam == "users" || sourceParam == "sessions" {
			source = &sourceParam
		} else {
			h.log.Error(r.Request.Context(), "invalid source parameter: %s", sourceParam)
			return nil, http.StatusBadRequest, fmt.Errorf("invalid source parameter: must be one of 'events', 'users', or 'sessions'")
		}
	}

	var eventName *string
	if eventNameParam := r.Request.URL.Query().Get("eventName"); eventNameParam != "" {
		eventName = &eventNameParam
	}

	limit := lexicon.DefaultPropertiesLimit
	if limitParam := r.Request.URL.Query().Get("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	page := 1
	if pageParam := r.Request.URL.Query().Get("page"); pageParam != "" {
		if parsedPage, err := strconv.Atoi(pageParam); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}
	offset := filters.CalculateOffset(page, limit)

	properties, total, err := h.lexicon.GetProperties(r.Request.Context(), projID, source, eventName, limit, offset)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get properties for project %d: %v", projID, err)
		return nil, http.StatusInternalServerError, err
	}

	response := &model.LexiconPropertiesResponse{
		Properties: properties,
		Total:      total,
	}

	return response, 0, nil
}

// @Summary Update Event
// @Description Update an event's display name, description, or status. Requires name and autoCaptured to identify the event, checks if event exists before updating.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param body body model.UpdateEventRequest true "Update Event Request (name and autoCaptured are required)"
// @Success 200 {object} map[string]interface{} "Returns success: true"
// @Failure 400 {object} api.ErrorResponse "Invalid request, missing required fields, or event not found"
// @Failure 500 {object} api.ErrorResponse "Internal server error"
// @Router /{project}/lexicon/events [put]
func (h *handlersImpl) updateEvent(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var req model.UpdateEventRequest
	if err := json.Unmarshal(r.Body, &req); err != nil {
		h.log.Error(r.Request.Context(), "failed to parse request body: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if err := filters.ValidateStruct(req); err != nil {
		h.log.Error(r.Request.Context(), "validation failed for update event request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	userData := api.GetUser(r.Request)
	userID := ""
	if userData != nil {
		userID = strconv.FormatUint(userData.ID, 10)
	}

	if err := h.lexicon.UpdateEvent(r.Request.Context(), projID, req, userID); err != nil {
		h.log.Error(r.Request.Context(), "failed to update event %s for project %d: %v", req.Name, projID, err)
		return nil, http.StatusInternalServerError, err
	}

	return map[string]interface{}{"success": true}, 0, nil
}

// @Summary Update Property
// @Description Update a property's display name, description, or status. Requires name, source, and autoCaptured to identify the property, fetches is_event_property from existing record and checks if property exists before updating.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param body body model.UpdatePropertyRequest true "Update Property Request (name, source, and autoCaptured are required)"
// @Success 200 {object} map[string]interface{} "Returns success: true"
// @Failure 400 {object} api.ErrorResponse "Invalid request, missing required fields, invalid source value, or property not found"
// @Failure 500 {object} api.ErrorResponse "Internal server error"
// @Router /{project}/lexicon/properties [put]
func (h *handlersImpl) updateProperty(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var req model.UpdatePropertyRequest
	if err := json.Unmarshal(r.Body, &req); err != nil {
		h.log.Error(r.Request.Context(), "failed to parse request body: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if err := filters.ValidateStruct(req); err != nil {
		h.log.Error(r.Request.Context(), "validation failed for update property request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	userData := api.GetUser(r.Request)
	userID := ""
	if userData != nil {
		userID = strconv.FormatUint(userData.ID, 10)
	}

	if err := h.lexicon.UpdateProperty(r.Request.Context(), projID, req, userID); err != nil {
		h.log.Error(r.Request.Context(), "failed to update property %s for project %d: %v", req.Name, projID, err)
		return nil, http.StatusInternalServerError, err
	}

	return map[string]interface{}{"success": true}, 0, nil
}
