package data_integration

import (
	"encoding/json"
	"fmt"
	"net/http"
	"openreplay/backend/internal/config/integrations"
	"openreplay/backend/pkg/logger"
	api2 "openreplay/backend/pkg/server/api"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

type Handlers struct {
	log           logger.Logger
	JsonSizeLimit int64
	services      *ServiceBuilder
}

func NewHandlers(log logger.Logger, cfg *integrations.Config, services *ServiceBuilder) (*Handlers, error) {
	return &Handlers{
		log:           log,
		JsonSizeLimit: cfg.JsonSizeLimit,
		services:      services,
	}, nil
}

func (e *Handlers) GetAll() []*api2.HandlerDescription {
	return []*api2.HandlerDescription{
		{"/v1/integrations/{name}/{project}", e.createIntegration, []string{"POST", "OPTIONS"}},
		{"/v1/integrations/{name}/{project}", e.getIntegration, []string{"GET", "OPTIONS"}},
		{"/v1/integrations/{name}/{project}", e.updateIntegration, []string{"PATCH", "OPTIONS"}},
		{"/v1/integrations/{name}/{project}", e.deleteIntegration, []string{"DELETE", "OPTIONS"}},
		{"/v1/integrations/{name}/{project}/data/{session}", e.getIntegrationData, []string{"GET", "OPTIONS"}},
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

func (e *Handlers) createIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api2.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &IntegrationRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.services.Integrator.AddIntegration(project, integration, req.IntegrationData); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	api2.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) getIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	intParams, err := e.services.Integrator.GetIntegration(project, integration)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	api2.ResponseWithJSON(e.log, r.Context(), w, intParams, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) updateIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api2.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &IntegrationRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.services.Integrator.UpdateIntegration(project, integration, req.IntegrationData); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	api2.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) deleteIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.services.Integrator.DeleteIntegration(project, integration); err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	api2.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Handlers) getIntegrationData(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	session, err := getIntegrationSession(r)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	url, err := e.services.Integrator.GetSessionDataURL(project, integration, session)
	if err != nil {
		api2.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := map[string]string{"url": url}
	api2.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}
