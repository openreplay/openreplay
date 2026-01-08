package api

import (
	"net/http"

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
	*api.BaseHandler
	lexicon lexicon.Lexicon
}

func NewHandlers(log logger.Logger, jsonSizeLimit int64, lexicon lexicon.Lexicon, responser api.Responser) (api.Handlers, error) {
	return &handlersImpl{
		BaseHandler: api.NewBaseHandler(log, responser, jsonSizeLimit),
		lexicon:     lexicon,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{
			Path:        "/{project}/data/events",
			Method:      "GET",
			Handler:     api.AutoRespondContext(h, h.getDistinctEvents),
			Permissions: []string{"DATA_MANAGEMENT"},
			AuditTrail:  "",
		},
		{
			Path:        "/{project}/data/properties",
			Method:      "GET",
			Handler:     api.AutoRespondContext(h, h.getProperties),
			Permissions: []string{"DATA_MANAGEMENT"},
			AuditTrail:  "",
		},
	}
}

// @Summary Get Distinct Events
// @Description Retrieve a list of distinct events.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Success 200 {object} model.LexiconEventsResponse
// @Failure 400 {object} api.ErrorResponse
// @Failure 413 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/data/events [get]
func (h *handlersImpl) getDistinctEvents(r *api.RequestContext) (*model.LexiconEventsResponse, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.Log().Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	events, total, err := h.lexicon.GetDistinctEvents(r.Request.Context(), projID)
	if err != nil {
		h.Log().Error(r.Request.Context(), "failed to get events for project %d: %v", projID, err)
		return nil, http.StatusNotFound, err
	}

	response := &model.LexiconEventsResponse{
		Events: events,
		Total:  total,
	}

	return response, 0, nil
}

// @Summary Get Properties
// @Description Retrieve a list of properties.
// @Tags Analytics - Lexicon
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param source query string false "Source filter (events or users)"
// @Success 200 {object} []model.LexiconProperty
// @Failure 400 {object} api.ErrorResponse
// @Failure 413 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/data/properties [get]
func (h *handlersImpl) getProperties(r *api.RequestContext) (*model.LexiconPropertiesResponse, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.Log().Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	var source *string
	if sourceParam := r.Request.URL.Query().Get("source"); sourceParam != "" {
		if sourceParam == "events" || sourceParam == "users" {
			source = &sourceParam
		}
	}

	properties, total, err := h.lexicon.GetProperties(r.Request.Context(), projID, source)
	if err != nil {
		h.Log().Error(r.Request.Context(), "failed to get properties for project %d: %v", projID, err)
		return nil, http.StatusNotFound, err
	}

	response := &model.LexiconPropertiesResponse{
		Properties: properties,
		Total:      total,
	}

	return response, 0, nil
}
