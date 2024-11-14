package data_integration

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"

	metrics "openreplay/backend/pkg/metrics/heuristics"
)

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

func (e *Router) createIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &IntegrationRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.services.Integrator.AddIntegration(project, integration, req.IntegrationData); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.ResponseOK(r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Router) getIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	intParams, err := e.services.Integrator.GetIntegration(project, integration)
	if err != nil {
		if strings.Contains(err.Error(), "no rows in result set") {
			e.ResponseWithError(r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}
	e.ResponseWithJSON(r.Context(), w, intParams, startTime, r.URL.Path, bodySize)
}

func (e *Router) updateIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &IntegrationRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.services.Integrator.UpdateIntegration(project, integration, req.IntegrationData); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.ResponseOK(r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Router) deleteIntegration(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.services.Integrator.DeleteIntegration(project, integration); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.ResponseOK(r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *Router) getIntegrationData(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	integration, project, err := getIntegrationsArgs(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	session, err := getIntegrationSession(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	url, err := e.services.Integrator.GetSessionDataURL(project, integration, session)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := map[string]string{"url": url}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func recordMetrics(requestStart time.Time, url string, code, bodySize int) {
	if bodySize > 0 {
		metrics.RecordRequestSize(float64(bodySize), url, code)
	}
	metrics.IncreaseTotalRequests()
	metrics.RecordRequestDuration(float64(time.Now().Sub(requestStart).Milliseconds()), url, code)
}

func (e *Router) readBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	bodyBytes, err := io.ReadAll(body)

	// Close body
	if closeErr := body.Close(); closeErr != nil {
		e.log.Warn(r.Context(), "error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func (e *Router) ResponseOK(ctx context.Context, w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	w.WriteHeader(http.StatusOK)
	e.log.Info(ctx, "response ok")
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func (e *Router) ResponseWithJSON(ctx context.Context, w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	e.log.Info(ctx, "response ok")
	body, err := json.Marshal(res)
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

type response struct {
	Error string `json:"error"`
}

func (e *Router) ResponseWithError(ctx context.Context, w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	e.log.Error(ctx, "response error, code: %d, error: %s", code, err)
	body, err := json.Marshal(&response{err.Error()})
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.WriteHeader(code)
	w.Write(body)
	recordMetrics(requestStart, url, code, bodySize)
}
