package api

import (
	"errors"
	"net/http"

	filters_catalog "openreplay/backend/pkg/analytics/filters_catalog"
	"openreplay/backend/pkg/assist/proxy"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
)

var errAutocompleteFailed = errors.New("failed to fetch autocomplete suggestions")

type handlersImpl struct {
	log      logger.Logger
	service  filters_catalog.FiltersCatalog
	projects projects.Projects
	assist   proxy.Assist
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, service filters_catalog.FiltersCatalog, p projects.Projects, assist proxy.Assist) (api.Handlers, error) {
	h := &handlersImpl{log: log, service: service, projects: p, assist: assist}
	h.handlers = []*api.Description{
		{"/{project}/filters", "GET", req.Handle(h.getAllFilters), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
		{"/{project}/events/autocomplete", "GET", req.Handle(h.autocompleteEvents), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
		{"/{project}/properties/autocomplete", "GET", req.Handle(h.autocompleteProperties), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
	}
	return h, nil
}

func (h *handlersImpl) GetAll() []*api.Description { return h.handlers }

// @Summary Get filters catalog
// @Description Returns the union of session/user/event/segment/feature filter
//
//	definitions used to populate the analytics filter UI.
//
// @Tags Analytics - Filters
// @Param project path uint true "Project ID"
// @Success 200 {object} model.AllFiltersResponse
// @Router /{project}/filters [get]
func (h *handlersImpl) getAllFilters(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	user := api.GetUser(r.Request)
	var userID uint64
	if user != nil {
		userID = user.ID
	}

	platform := "web"
	if proj, err := h.projects.GetProject(projID); err == nil && proj != nil && proj.Platform != "" {
		platform = proj.Platform
	}

	resp, err := h.service.GetAllFilters(r.Request.Context(), projID, userID, platform)
	if err != nil {
		h.log.Error(r.Request.Context(), "filters catalog for project %d: %v", projID, err)
		return nil, http.StatusInternalServerError, err
	}
	return resp, 0, nil
}

// @Summary Events autocomplete
// @Description Suggests event names matching the optional `q` query.
// @Tags Analytics - Filters
// @Param project path uint true "Project ID"
// @Param q query string false "Search query"
// @Router /{project}/events/autocomplete [get]
func (h *handlersImpl) autocompleteEvents(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	q := r.Request.URL.Query().Get("q")
	rows, err := h.service.SearchEventsAutocomplete(r.Request.Context(), projID, q)
	if err != nil {
		h.log.Error(r.Request.Context(), "events autocomplete for project %d: %v", projID, err)
		return nil, http.StatusInternalServerError, errAutocompleteFailed
	}
	return rows, 0, nil
}

// @Summary Properties autocomplete
// @Description Suggests property values. With live=true, values are fetched
//
//	from the assist service; otherwise from the analytics tables based on source.
//
// @Tags Analytics - Filters
// @Param project path uint true "Project ID"
// @Param propertyName query string true "Property name"
// @Param eventName query string false "Event name"
// @Param userId query string false "User ID"
// @Param source query string false "Scope source (session/event/user/metadata)"
// @Param q query string false "Search query"
// @Param ac query bool false "Auto captured"
// @Param live query bool false "Fetch live values from assist"
// @Router /{project}/properties/autocomplete [get]
func (h *handlersImpl) autocompleteProperties(r *api.RequestContext) (any, int, error) {
	projID, err := r.GetProjectID()
	if err != nil {
		h.log.Error(r.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	qv := r.Request.URL.Query()
	propertyName := qv.Get("propertyName")
	if propertyName == "" {
		return nil, http.StatusBadRequest, errors.New("propertyName is required")
	}

	if qv.Get("live") == "true" {
		res, err := h.assist.Autocomplete(projID, qv.Get("q"), propertyName)
		if err != nil {
			h.log.Error(r.Request.Context(), "live properties autocomplete for project %d: %v", projID, err)
			return []map[string]interface{}{}, 0, nil
		}
		return res, 0, nil
	}

	rows, err := h.service.SearchPropertiesAutocomplete(
		r.Request.Context(), projID,
		propertyName, qv.Get("eventName"), qv.Get("userId"), qv.Get("source"), qv.Get("q"),
		qv.Get("ac") == "true",
	)
	if err != nil {
		h.log.Error(r.Request.Context(), "properties autocomplete for project %d: %v", projID, err)
		return nil, http.StatusInternalServerError, errAutocompleteFailed
	}
	return rows, 0, nil
}
