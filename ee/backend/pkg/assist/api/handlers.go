package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	assistAPI "openreplay/backend/internal/config/assist"
	"openreplay/backend/pkg/assist/service"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessionmanager"
)

type handlersImpl struct {
	cfg           *assistAPI.Config
	log           logger.Logger
	responser     api.Responser
	jsonSizeLimit int64
	assist        service.Assist
}

func NewHandlers(log logger.Logger, cfg *assistAPI.Config, responser api.Responser, assist service.Assist) (api.Handlers, error) {
	return &handlersImpl{
		cfg:           cfg,
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		assist:        assist,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	keyPrefix := "/assist"
	if e.cfg.AssistKey != "" {
		keyPrefix = fmt.Sprintf("/assist/%s", e.cfg.AssistKey)
	}
	return []*api.Description{
		{keyPrefix + "/sockets-list/{projectKey}/autocomplete", "GET", e.autocomplete, api.NoPermissions, api.DoNotTrack},        // event search with live=true
		{keyPrefix + "/sockets-list/{projectKey}/{sessionId}", "GET", e.socketsListByProject, api.NoPermissions, api.DoNotTrack}, // is_live for getReplay call
		{keyPrefix + "/sockets-live/{projectKey}", "POST", e.socketsLiveByProject, api.NoPermissions, api.DoNotTrack},            // handler /{projectId}/assist/sessions for co-browser
		{keyPrefix + "/sockets-live/{projectKey}/{sessionId}", "GET", e.socketsLiveBySession, api.NoPermissions, api.DoNotTrack}, // for get_live_session (with data) and for session_exists
		{"/v1/{project}/assist/events", "POST", e.collectAssistStats, api.NoPermissions, api.DoNotTrack},
		{"GET", "/v1/ping", e.ping, api.NoPermissions, api.DoNotTrack},
	}
}

func (e *handlersImpl) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func getProjectKey(r *http.Request) (string, error) {
	vars := mux.Vars(r)
	key := vars["projectKey"]
	if key == "" {
		return "", fmt.Errorf("empty project key")
	}
	return key, nil
}

func getSessionID(r *http.Request) (string, error) {
	vars := mux.Vars(r)
	key := vars["sessionId"]
	if key == "" {
		return "", fmt.Errorf("empty session ID")
	}
	return key, nil
}

func getQuery(r *http.Request) (*service.Query, error) {
	params := r.URL.Query()
	q := &service.Query{
		Key:   params.Get("key"),
		Value: params.Get("q"),
	}
	if q.Key == "" || q.Value == "" {
		return nil, fmt.Errorf("empty key or value")
	}
	return q, nil
}

func (e *handlersImpl) autocomplete(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectKey, err := getProjectKey(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	query, err := getQuery(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp, err := e.assist.Autocomplete(projectKey, query)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	response := map[string]interface{}{
		"data": resp,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, response, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) socketsListByProject(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectKey, err := getProjectKey(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	sessionID, err := getSessionID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp, err := e.assist.GetByID(projectKey, sessionID)
	if err != nil {
		if errors.Is(err, sessionmanager.ErrSessionNotFound) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if errors.Is(err, sessionmanager.ErrSessionNotBelongToProject) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}
	response := map[string]interface{}{
		"data": resp,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, response, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) socketsLiveByProject(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectKey, err := getProjectKey(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.log.Debug(context.Background(), "bodyBytes: %s", bodyBytes)
	bodySize = len(bodyBytes)
	req := &service.Request{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp, err := e.assist.GetAll(projectKey, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	response := map[string]interface{}{
		"data": resp,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, response, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) socketsLiveBySession(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectKey, err := getProjectKey(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	sessionID, err := getSessionID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp, err := e.assist.GetByID(projectKey, sessionID)
	if err != nil {
		if errors.Is(err, sessionmanager.ErrSessionNotFound) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if errors.Is(err, sessionmanager.ErrSessionNotBelongToProject) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}
	response := map[string]interface{}{
		"data": resp,
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, response, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) collectAssistStats(w http.ResponseWriter, r *http.Request) {
	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotImplemented, errors.New("not implemented"), time.Now(), r.URL.Path, 0)
}
