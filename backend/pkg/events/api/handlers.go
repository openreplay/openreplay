package api

import (
	"encoding/json"
	"net/http"
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/events"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/session"
)

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	events        events.Events
	sessions      session.Service
	jsonSizeLimit int64
}

func NewHandlers(log logger.Logger, cfg *common.HTTP, responser api.Responser, events events.Events, sessions session.Service) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		events:        events,
		sessions:      sessions,
		jsonSizeLimit: cfg.JsonSizeLimit,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{project}/sessions/{session}/events", "GET", h.getEvents, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
		{"/v1/{project}/sessions/{session}/clickmaps", "POST", h.getClickmaps, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
	}
}

const (
	GroupClickRage bool = true
)

func (h *handlersImpl) getEvents(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	sessID, err := api.GetSessionID(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	platform, err := h.sessions.GetPlatform(projID, sessID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	response := make(map[string]interface{})

	if platform == "web" {
		response["events"] = h.events.GetBySessionID(projID, sessID, GroupClickRage)
		allErrors := h.events.GetErrorsBySessionID(projID, sessID)
		stackEvents := make([]interface{}, 0)
		errors := make([]interface{}, 0)
		for _, sessErr := range allErrors {
			if sessErr.IsNotJsException() {
				stackEvents = append(stackEvents, sessErr)
			} else {
				errors = append(errors, sessErr)
			}
		}
		response["stackEvents"] = stackEvents
		response["errors"] = errors
		response["userEvents"] = h.events.GetCustomsBySessionID(projID, sessID)
	} else {
		response["events"] = h.events.GetMobileBySessionID(projID, sessID)
		response["crashes"] = h.events.GetMobileCrashesBySessionID(sessID)
		response["userEvents"] = h.events.GetMobileCustomsBySessionID(projID, sessID)
	}
	response["issues"] = h.events.GetIssuesBySessionID(projID, sessID)
	response["incidents"] = h.events.GetIncidentsBySessionID(projID, sessID)
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return
}

type getClickmapsRequest struct {
	Url string `json:"url"`
}

func (h *handlersImpl) getClickmaps(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(h.log, w, r, h.jsonSizeLimit)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &getClickmapsRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	sessID, err := api.GetSessionID(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	response, err := h.events.GetClickMaps(projID, sessID, req.Url)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return
}
