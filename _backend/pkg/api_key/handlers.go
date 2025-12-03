package api_key

import (
	"net/http"
	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"time"
)

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	projects      projects.Projects
	jsonSizeLimit int64
}

func NewHandlers(log logger.Logger, cfg *common.HTTP, responser api.Responser, projects projects.Projects) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		projects:      projects,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/projects/{project}", "GET", h.getProject, []string{api.PublicKeyPermission}, api.DoNotTrack},
	}
}

func (h *handlersImpl) getProject(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectKey, err := api.GetParam(r, "project")
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	project, err := h.projects.GetProjectByKey(string(projectKey))
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		return
	}

	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": project}, startTime, r.URL.Path, bodySize)
}
