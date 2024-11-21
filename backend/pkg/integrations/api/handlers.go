package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"

	integrationsCfg "openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/integrations/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log           logger.Logger
	responser     *api.Responser
	integrations  service.Service
	jsonSizeLimit int64
}

func NewHandlers(log logger.Logger, cfg *integrationsCfg.Config, responser *api.Responser, integrations service.Service) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		integrations:  integrations,
		jsonSizeLimit: cfg.JsonSizeLimit,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/integrations/{name}/{project}", e.createIntegration, "POST"},
		{"/v1/integrations/{name}/{project}", e.getIntegration, "GET"},
		{"/v1/integrations/{name}/{project}", e.updateIntegration, "PATCH"},
		{"/v1/integrations/{name}/{project}", e.deleteIntegration, "DELETE"},
		{"/v1/integrations/{name}/{project}/data/{session}", e.getIntegrationData, "GET"},
	}
}

func getIntegrationsArgs(r *http.Request) (string, uint64, error) {
	vars := mux.Vars(r)
	name := vars["name"]
	if name == "" {
		return "", 0, fmt.Errorf("empty integration name")
	}
	project := vars["project"]
	if project == "" {
		return "", 0, fmt.Errorf("project id is empty")
	}
	projID, err := strconv.ParseUint(project, 10, 64)
	if err != nil || projID <= 0 {
		return "", 0, fmt.Errorf("invalid project id")
	}
	return name, projID, nil
}

func getIntegrationSession(r *http.Request) (uint64, error) {
	vars := mux.Vars(r)
	session := vars["session"]
	if session == "" {
		return 0, fmt.Errorf("session id is empty")
	}
	sessID, err := strconv.ParseUint(session, 10, 64)
	if err != nil || sessID <= 0 {
		return 0, fmt.Errorf("invalid session id")
	}
	return sessID, nil
}

type IntegrationRequest struct {
	IntegrationData map[string]string `json:"data"`
}

func (e *handlersImpl) createIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &IntegrationRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.integrations.AddIntegration(project, integration, req.IntegrationData); err != nil {
		if strings.Contains(err.Error(), "failed to validate") {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnprocessableEntity, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}
	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	intParams, err := e.integrations.GetIntegration(project, integration)
	if err != nil {
		if strings.Contains(err.Error(), "no rows in result set") {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, intParams, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updateIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &IntegrationRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.integrations.UpdateIntegration(project, integration, req.IntegrationData); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) deleteIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.integrations.DeleteIntegration(project, integration); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getIntegrationData(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	session, err := getIntegrationSession(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	url, err := e.integrations.GetSessionDataURL(project, integration, session)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := map[string]string{"url": url}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}
