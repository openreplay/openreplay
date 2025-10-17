package api

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/replays/service"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/session"
)

type handlersImpl struct {
	log       logger.Logger
	responser api.Responser
	sessions  session.Service
	files     service.Files
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{project}/sessions/{session}/first-mob", "GET", h.getFirstMob, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
		{"/v1/{project}/unprocessed/{session}/dom.mob", "GET", h.getUnprocessedMob, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY", "ASSIST_LIVE", "SERVICE_ASSIST_LIVE"}, api.DoNotTrack},
		{"/v1/{project}/unprocessed/{session}/devtools.mob", "GET", h.getUnprocessedDevtools, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY", "ASSIST_LIVE", "SERVICE_ASSIST_LIVE", "DEV_TOOLS", "SERVICE_DEV_TOOLS"}, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, responser api.Responser, sessions session.Service, files service.Files) (api.Handlers, error) {
	return &handlersImpl{
		log:       log,
		responser: responser,
		sessions:  sessions,
		files:     files,
	}, nil
}

func (h *handlersImpl) getFirstMob(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		h.log.Error(r.Context(), "Error getting project ID: %v", err)
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong project id"), startTime, r.URL.Path, bodySize)
		return
	}
	sessID, err := api.GetSessionID(r)
	if err != nil {
		h.log.Error(r.Context(), "Error getting session ID: %v", err)
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong session id"), startTime, r.URL.Path, bodySize)
		return
	}

	h.log.Info(r.Context(), "getFirstMob: sessID: %v, projID: %v", sessID, projID)

	urls, err := h.files.GetMobStartUrl(sessID)
	if err != nil {
		h.log.Error(r.Context(), "Error getting start urls: %v", err)
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong session id"), startTime, r.URL.Path, bodySize)
		return
	}
	res := map[string]interface{}{"domURL": urls}
	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": res}, startTime, r.URL.Path, bodySize)
}

func (h *handlersImpl) getUnprocessedMob(w http.ResponseWriter, r *http.Request) {
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

	notFoundResponse := map[string]interface{}{"errors": []string{"Replay file not found"}}

	isSessionExists, err := h.sessions.IsExists(projID, sessID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	if !isSessionExists {
		h.responser.ResponseWithJSON(h.log, r.Context(), w, notFoundResponse, startTime, r.URL.Path, bodySize)
		return
	}
	// TODO: check in assist
	path, err := h.files.GetUnprocessedMob(sessID)
	if err != nil {
		h.responser.ResponseWithJSON(h.log, r.Context(), w, notFoundResponse, startTime, r.URL.Path, bodySize)
		return
	}
	downloadHandler(w, r, path)
}

func downloadHandler(w http.ResponseWriter, r *http.Request, filePath string) {
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "File not found.", http.StatusNotFound)
		return
	}
	defer file.Close()

	fileName := filepath.Base(filePath)

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")

	http.ServeFile(w, r, filePath)
}

func (h *handlersImpl) getUnprocessedDevtools(w http.ResponseWriter, r *http.Request) {
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

	notFoundResponse := map[string]interface{}{"errors": []string{"Devtools file not found"}}

	isSessionExists, err := h.sessions.IsExists(projID, sessID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	if !isSessionExists {
		h.responser.ResponseWithJSON(h.log, r.Context(), w, notFoundResponse, startTime, r.URL.Path, bodySize)
		return
	}
	// TODO: check in assist
	path, err := h.files.GetUnprocessedDevtools(sessID)
	if err != nil {
		h.responser.ResponseWithJSON(h.log, r.Context(), w, notFoundResponse, startTime, r.URL.Path, bodySize)
		return
	}
	downloadHandler(w, r, path)

}
