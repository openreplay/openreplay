package api

import (
	"net/http"

	filters_catalog "openreplay/backend/pkg/analytics/filters_catalog"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log      logger.Logger
	service  filters_catalog.FiltersCatalog
	projects projects.Projects
	handlers []*api.Description
}

func NewHandlers(log logger.Logger, req api.RequestHandler, service filters_catalog.FiltersCatalog, p projects.Projects) (api.Handlers, error) {
	h := &handlersImpl{log: log, service: service, projects: p}
	h.handlers = []*api.Description{
		{"/{project}/filters", "GET", req.Handle(h.getAllFilters), []string{api.DATA_MANAGEMENT}, api.DoNotTrack},
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
