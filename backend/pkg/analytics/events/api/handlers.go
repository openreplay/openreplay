package api

import (
	"encoding/json"
	"net/http"
	"time"

	"openreplay/backend/pkg/analytics/events"
	"openreplay/backend/pkg/analytics/events/model"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

type Handlers interface {
	GetAll() []*api.Description
}

type handlersImpl struct {
	log           logger.Logger
	events        events.Events
	responser     api.Responser
	jsonSizeLimit int64
}

func NewHandlers(log logger.Logger, jsonSizeLimit int64, events events.Events, responser api.Responser) (Handlers, error) {
	return &handlersImpl{
		log:           log,
		events:        events,
		responser:     responser,
		jsonSizeLimit: jsonSizeLimit,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{
			Path:        "/{project}/events",
			Method:      "POST",
			Handler:     h.eventsSearch,
			Permissions: []string{"DATA_MANAGEMENT"},
			AuditTrail:  "",
		},
		{
			Path:        "/{project}/events/{eventId}",
			Method:      "GET",
			Handler:     h.getEvent,
			Permissions: []string{"DATA_MANAGEMENT"},
			AuditTrail:  "",
		},
	}
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

	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
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

	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	eventID, err := api.GetPathParam(r, "eventId", api.ParseString)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
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