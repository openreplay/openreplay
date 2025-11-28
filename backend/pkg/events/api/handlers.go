package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/events"
	"openreplay/backend/pkg/events/model"
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
		{"/{project}/sessions/{session}/events", "GET", h.getEvents, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
		{"/{project}/sessions/{session}/clickmaps", "POST", h.getClickmaps, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
		{"/{project}/events", "POST", h.eventsSearch, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
		{"/{project}/events/{eventId}", "GET", h.getEvent, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
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

	async := func(wg *sync.WaitGroup, fn func()) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			fn()
		}()
	}
	var (
		wg            sync.WaitGroup
		eventsRes     interface{}
		errorsRes     interface{}
		userEventsRes interface{}
		crashesRes    interface{}
		issuesRes     interface{}
		incidentsRes  interface{}
	)

	if platform == "web" {
		async(&wg, func() { eventsRes = h.events.GetBySessionID(projID, sessID, GroupClickRage) })
		async(&wg, func() { errorsRes = h.events.GetErrorsBySessionID(projID, sessID) })
		async(&wg, func() { userEventsRes = h.events.GetCustomsBySessionID(projID, sessID) })
	} else {
		async(&wg, func() { eventsRes = h.events.GetMobileBySessionID(projID, sessID) })
		async(&wg, func() { crashesRes = h.events.GetMobileCrashesBySessionID(sessID) })
		async(&wg, func() { userEventsRes = h.events.GetMobileCustomsBySessionID(sessID) })
	}
	async(&wg, func() { issuesRes = h.events.GetIssuesBySessionID(projID, sessID) })
	async(&wg, func() { incidentsRes = h.events.GetIncidentsBySessionID(projID, sessID) })

	wg.Wait()

	response := map[string]interface{}{
		"events":     eventsRes,
		"userEvents": userEventsRes,
		"issues":     issuesRes,
		"incidents":  incidentsRes,
	}
	if platform == "web" {
		response["errors"] = errorsRes
	} else {
		response["crashes"] = crashesRes
	}

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

func (h *handlersImpl) eventsSearch(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(h.log, w, r, h.jsonSizeLimit)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &model.EventsSearchRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err = model.ValidateStruct(req); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	response, err := h.events.SearchEvents(projID, req)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return
}

func (h *handlersImpl) getEvent(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	vars := mux.Vars(r)
	eventID := vars["eventId"]
	
	if eventID == "" {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("missing eventId parameter"), startTime, r.URL.Path, bodySize)
		return
	}

	response, err := h.events.GetEventByID(projID, eventID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		return
	}

	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return
}
