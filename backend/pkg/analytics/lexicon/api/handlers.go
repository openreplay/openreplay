package api

import (
	"encoding/json"
	"errors"
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
	actions  lexicon.Actions
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, lexicon lexicon.Lexicon, actions lexicon.Actions) (api.Handlers, error) {
	h := &handlersImpl{
		log:     log,
		lexicon: lexicon,
		actions: actions,
	}
	h.handlers = []*api.Description{
		{"/{project}/lexicon/events", "GET", req.Handle(h.getDistinctEvents), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
		{"/{project}/lexicon/properties", "GET", req.Handle(h.getProperties), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
		{"/{project}/lexicon/events", "PUT", req.HandleWithBody(h.updateEvent), []string{api.DATA_MANAGEMENT}, "update_event"},
		{"/{project}/lexicon/properties", "PUT", req.HandleWithBody(h.updateProperty), []string{api.DATA_MANAGEMENT}, "update_property"},
		{"/{project}/lexicon/actions/search", "POST", req.HandleWithBody(h.searchActions), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
		{"/{project}/lexicon/actions", "POST", req.HandleWithBody(h.createAction), []string{api.DATA_MANAGEMENT}, "create_action"},
		{"/{project}/lexicon/actions/{actionId}", "PUT", req.HandleWithBody(h.updateAction), []string{api.DATA_MANAGEMENT}, "update_action"},
		{"/{project}/lexicon/actions/{actionId}", "DELETE", req.Handle(h.deleteAction), []string{api.DATA_MANAGEMENT}, "delete_action"},
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

// @Summary Search Actions
// @Description Search actions with optional filters, sorting, and pagination.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param body body model.SearchActionRequest true "Search Action Request"
// @Success 200 {object} model.SearchActionsResponse
// @Failure 400 {object} api.ErrorResponse "Invalid request or validation error"
// @Failure 500 {object} api.ErrorResponse "Internal server error"
// @Router /{project}/lexicon/actions/search [post]
func (h *handlersImpl) searchActions(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var req model.SearchActionRequest
	if err := json.Unmarshal(r.Body, &req); err != nil {
		h.log.Error(r.Request.Context(), "failed to parse search actions request body: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if err := filters.ValidateStruct(req); err != nil {
		h.log.Error(r.Request.Context(), "validation failed for search actions request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	response, err := h.actions.Search(r.Request.Context(), projID, &req)
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to search actions for project %d: %v", projID, err)
		return nil, http.StatusInternalServerError, err
	}

	return response, 0, nil
}

// @Summary Create Action
// @Description Create a new action with specified name, description, filters, and visibility.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param body body model.CreateActionRequest true "Create Action Request"
// @Success 200 {object} model.Action "Returns the created action"
// @Failure 400 {object} api.ErrorResponse "Invalid request or missing required fields"
// @Failure 409 {object} api.ErrorResponse "Action with this name already exists"
// @Failure 500 {object} api.ErrorResponse "Internal server error"
// @Router /{project}/lexicon/actions [post]
func (h *handlersImpl) createAction(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var req model.CreateActionRequest
	if err := json.Unmarshal(r.Body, &req); err != nil {
		h.log.Error(r.Request.Context(), "failed to parse request body: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if err := filters.ValidateStruct(req); err != nil {
		h.log.Error(r.Request.Context(), "validation failed for create action request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	userData := api.GetUser(r.Request)
	var userID uint64
	if userData != nil {
		userID = userData.ID
	}

	action, err := h.actions.Create(r.Request.Context(), projID, userID, &req)
	if err != nil {
		if errors.Is(err, lexicon.ErrActionDuplicate) {
			return nil, http.StatusConflict, err
		}
		h.log.Error(r.Request.Context(), "failed to create action for project %d: %v", projID, err)
		return nil, http.StatusInternalServerError, err
	}

	return action, 0, nil
}

// @Summary Update Action
// @Description Update an existing action's name, description, filters, or visibility.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param actionId path string true "Action ID"
// @Param body body model.UpdateActionRequest true "Update Action Request"
// @Success 200 {object} model.Action "Returns the updated action"
// @Failure 400 {object} api.ErrorResponse "Invalid request, validation error, or no fields to update"
// @Failure 404 {object} api.ErrorResponse "Action not found"
// @Failure 409 {object} api.ErrorResponse "Action with this name already exists"
// @Failure 500 {object} api.ErrorResponse "Internal server error"
// @Router /{project}/lexicon/actions/{actionId} [put]
func (h *handlersImpl) updateAction(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	actionID, err := api.GetParam(r.Request, "actionId")
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get action ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var req model.UpdateActionRequest
	if err := json.Unmarshal(r.Body, &req); err != nil {
		h.log.Error(r.Request.Context(), "failed to parse update action request body: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if err := filters.ValidateStruct(req); err != nil {
		h.log.Error(r.Request.Context(), "validation failed for update action request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	action, err := h.actions.Update(r.Request.Context(), projID, actionID, &req)
	if err != nil {
		if errors.Is(err, lexicon.ErrNoFieldsToUpdate) {
			return nil, http.StatusBadRequest, err
		}
		if errors.Is(err, lexicon.ErrActionNotFound) {
			return nil, http.StatusNotFound, err
		}
		if errors.Is(err, lexicon.ErrActionDuplicate) {
			return nil, http.StatusConflict, err
		}
		h.log.Error(r.Request.Context(), "failed to update action %s for project %d: %v", actionID, projID, err)
		return nil, http.StatusInternalServerError, err
	}

	return action, 0, nil
}

// @Summary Delete Action
// @Description Delete an action by ID.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param actionId path string true "Action ID"
// @Success 200 {object} map[string]interface{} "Returns success: true"
// @Failure 400 {object} api.ErrorResponse "Invalid request or missing action ID"
// @Failure 404 {object} api.ErrorResponse "Action not found"
// @Failure 500 {object} api.ErrorResponse "Internal server error"
// @Router /{project}/lexicon/actions/{actionId} [delete]
func (h *handlersImpl) deleteAction(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	actionID, err := api.GetParam(r.Request, "actionId")
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get action ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if err := h.actions.Delete(r.Request.Context(), projID, actionID); err != nil {
		if errors.Is(err, lexicon.ErrActionNotFound) {
			return nil, http.StatusNotFound, err
		}
		h.log.Error(r.Request.Context(), "failed to delete action %s for project %d: %v", actionID, projID, err)
		return nil, http.StatusInternalServerError, err
	}

	return map[string]interface{}{"success": true}, 0, nil
}
