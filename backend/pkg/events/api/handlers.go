package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/events"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/session"
)

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	events        events.Events
	sessions      session.Service
	projects      projects.Projects
	jsonSizeLimit int64
}

func NewHandlers(log logger.Logger, cfg *common.HTTP, responser api.Responser, events events.Events, sessions session.Service, projects projects.Projects) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		events:        events,
		sessions:      sessions,
		projects:      projects,
		jsonSizeLimit: cfg.JsonSizeLimit,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/{project}/sessions/{session}/events", "GET", h.getEvents, []string{api.SESSION_REPLAY, "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
		{"/{project}/sessions/{session}/clickmaps", "POST", h.getClickmaps, []string{api.SESSION_REPLAY, "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
	}
}

const sessionWindowMargin = time.Hour

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

	sessStartTs, sessDuration, found, err := h.sessions.GetSessionWindow(projID, sessID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	if !found {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong session id"), startTime, r.URL.Path, bodySize)
		return
	}

	project, err := h.projects.GetProject(projID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	platform := project.Platform

	lower := time.UnixMilli(sessStartTs).Add(-sessionWindowMargin)
	var upper time.Time
	if sessDuration != nil && *sessDuration > 1000 {
		upper = time.UnixMilli(sessStartTs).Add(time.Duration(*sessDuration) * time.Millisecond).Add(sessionWindowMargin)
	} else {
		upper = time.Now().Add(sessionWindowMargin)
	}

	runLane := func(wg *sync.WaitGroup, name string, fn func() error) *error {
		var laneErr error
		wg.Add(1)
		go func() {
			defer wg.Done()
			laneStart := time.Now()
			laneErr = fn()
			h.log.Debug(r.Context(), "events lane %s took %s", name, time.Since(laneStart))
		}()
		return &laneErr
	}

	var (
		wg            sync.WaitGroup
		rawEvents     = make([]interface{}, 0)
		errorsRes     = make([]interface{}, 0)
		userEventsRes = make([]interface{}, 0)
		crashesRes    = make([]interface{}, 0)
		issuesRes     = make([]interface{}, 0)
		incidentsRes  = make([]interface{}, 0)
		clickRage     = make([]interface{}, 0)
	)

	var eventsErr, errorsErr, customsErr, crashesErr *error
	issuesErr := runLane(&wg, "issues", func() error {
		var err error
		issuesRes, incidentsRes, clickRage, err = h.events.GetIssueEventsBySessionID(projID, sessID, lower, upper)
		return err
	})

	if platform == "web" {
		eventsErr = runLane(&wg, "events", func() error {
			var err error
			rawEvents, err = h.events.GetSessionEvents(projID, sessID, lower, upper)
			return err
		})
		errorsErr = runLane(&wg, "errors", func() error {
			res, err := h.events.GetErrorsBySessionID(projID, sessID, lower, upper)
			for _, r := range res {
				errorsRes = append(errorsRes, r)
			}
			return err
		})
		customsErr = runLane(&wg, "customs", func() error {
			var err error
			userEventsRes, err = h.events.GetCustomsBySessionID(projID, sessID, lower, upper)
			return err
		})
	} else {
		eventsErr = runLane(&wg, "events", func() error {
			var err error
			rawEvents, err = h.events.GetMobileSessionEvents(projID, sessID, lower, upper)
			return err
		})
		crashesErr = runLane(&wg, "crashes", func() error {
			var err error
			crashesRes, err = h.events.GetMobileCrashesBySessionID(sessID, lower, upper)
			return err
		})
		customsErr = runLane(&wg, "customs", func() error {
			var err error
			userEventsRes, err = h.events.GetMobileCustomsBySessionID(sessID, lower, upper)
			return err
		})
	}

	wg.Wait()

	for _, laneErr := range []*error{eventsErr, issuesErr, errorsErr, customsErr, crashesErr} {
		if laneErr != nil && *laneErr != nil {
			h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, *laneErr, startTime, r.URL.Path, bodySize)
			return
		}
	}

	eventsRes := h.events.GroupClicksToClickRage(rawEvents, clickRage)

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
