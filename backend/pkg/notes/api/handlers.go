package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/notes"
	"openreplay/backend/pkg/server/api"
)

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	jsonSizeLimit int64
	notes         notes.Notes
}

func NewHandlers(log logger.Logger, cfg *common.HTTP, responser api.Responser, notes notes.Notes) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonWithDataSizeLimit,
		notes:         notes,
	}, nil
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{project}/sessions/{session}/notes", "POST", h.createNote, []string{"SESSION_REPLAY"}, api.DoNotTrack},
		{"/v1/{project}/sessions/{session}/notes", "GET", h.getSessionNotes, []string{"SESSION_REPLAY", "SERVICE_READ_NOTES"}, api.DoNotTrack},
		{"/v1/{project}/notes/{note}", "GET", h.getNoteByID, []string{"SESSION_REPLAY"}, api.DoNotTrack},
		{"/v1/{project}/notes/{note}", "POST", h.editNote, []string{"SESSION_REPLAY"}, api.DoNotTrack},
		{"/v1/{project}/notes/{note}", "DELETE", h.deleteNote, []string{"SESSION_REPLAY"}, api.DoNotTrack},
		{"/v1/{project}/notes", "POST", h.getAllNotes, []string{"SESSION_REPLAY"}, api.DoNotTrack},
	}
}

type CreateNoteRequest struct {
	Message   *string `json:"message"`
	Tag       *string `json:"tag"`
	Timestamp int64   `json:"timestamp"`
	IsPublic  bool    `json:"isPublic"`
	Thumbnail *string `json:"thumbnail"`
	StartAt   *uint64 `json:"startAt"`
	EndAt     *uint64 `json:"endAt"`
}

// Notes
func (h *handlersImpl) createNote(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(h.log, w, r, h.jsonSizeLimit)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &CreateNoteRequest{}
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
	currUser := api.GetUser(r)
	if currUser == nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("unauthorized"), startTime, r.URL.Path, bodySize)
		return
	}
	newNote := &notes.Note{
		Message:   req.Message,
		Tag:       req.Tag,
		SessionID: sessID,
		Timestamp: req.Timestamp,
		IsPublic:  req.IsPublic,
		Thumbnail: req.Thumbnail,
		StartAt:   req.StartAt,
		EndAt:     req.EndAt,
	}

	savedNote, err := h.notes.Create(uint64(projID), currUser.ID, newNote)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": savedNote}, startTime, r.URL.Path, bodySize)
}

func (h *handlersImpl) getSessionNotes(w http.ResponseWriter, r *http.Request) {
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
	currUser := api.GetUser(r)
	if currUser == nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("unauthorized"), startTime, r.URL.Path, bodySize)
		return
	}
	sessNotes, err := h.notes.GetBySessionID(uint64(projID), currUser.ID, sessID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": sessNotes}, startTime, r.URL.Path, bodySize)
}

func (h *handlersImpl) getNoteByID(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	noteID, err := getNoteID(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	currUser := api.GetUser(r)
	if currUser == nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("unauthorized"), startTime, r.URL.Path, bodySize)
		return
	}
	note, err := h.notes.GetByID(uint64(projID), currUser.ID, noteID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": note}, startTime, r.URL.Path, bodySize)
}

type UpdateNoteRequest struct {
	Message   *string `json:"message"`
	Tag       *string `json:"tag"`
	IsPublic  *bool   `json:"is_public"`
	Timestamp *uint64 `json:"timestamp"`
}

func (h *handlersImpl) editNote(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(h.log, w, r, h.jsonSizeLimit)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &UpdateNoteRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	noteID, err := getNoteID(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	currUser := api.GetUser(r)
	if currUser == nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("unauthorized"), startTime, r.URL.Path, bodySize)
		return
	}

	updates := &notes.NoteUpdate{
		Message:   req.Message,
		Tag:       req.Tag,
		IsPublic:  req.IsPublic,
		Timestamp: req.Timestamp,
	}
	updatedNote, err := h.notes.Update(uint64(projID), currUser.ID, noteID, updates)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": updatedNote}, startTime, r.URL.Path, bodySize)
}

func (h *handlersImpl) deleteNote(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	noteID, err := getNoteID(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := h.notes.Delete(uint64(projID), noteID); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": noteID}, startTime, r.URL.Path, bodySize)
}

func (h *handlersImpl) getAllNotes(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(h.log, w, r, h.jsonSizeLimit)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &notes.GetOpts{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projID, err := api.GetProject(r)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	currUser := api.GetUser(r)
	if currUser == nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusUnauthorized, errors.New("unauthorized"), startTime, r.URL.Path, bodySize)
		return
	}

	allNodes, err := h.notes.GetAll(uint64(projID), currUser.ID, req)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": allNodes}, startTime, r.URL.Path, bodySize)
}

func getNoteID(r *http.Request) (uint64, error) {
	vars := mux.Vars(r)
	noteIDStr := vars["note"]
	noteID, err := strconv.ParseUint(noteIDStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid note ID: %w", err)
	}
	return noteID, nil
}
