package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	sessionCfg "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/assist/proxy"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/replays/service"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/session"
)

type handlersImpl struct {
	log           logger.Logger
	jsonSizeLimit int64
	responser     api.Responser
	sessions      session.Service
	assist        proxy.Assist
	files         service.Files
}

func NewHandlers(log logger.Logger, cfg *sessionCfg.Config, responser api.Responser, sessions session.Service, assist proxy.Assist, files service.Files) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		jsonSizeLimit: cfg.JsonSizeLimit,
		responser:     responser,
		sessions:      sessions,
		assist:        assist,
		files:         files,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/{project}/assist/sessions", "POST", e.getLiveSessions, api.NoPermissions, api.DoNotTrack}, // have a key access [ee]
		{"/{project}/assist/sessions/{session}", "GET", e.getLiveSession, []string{"ASSIST_LIVE", "SERVICE_ASSIST_LIVE"}, api.DoNotTrack},
		{"/{project}/sessions/{session}/replay", "GET", e.getReplay, []string{"SESSION_REPLAY", "SERVICE_SESSION_REPLAY"}, api.DoNotTrack},
	}
}

func (e *handlersImpl) getReplay(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		e.log.Error(r.Context(), "Error getting project ID: %v", err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong project id"), time.Now(), r.URL.Path, 0)
		return
	}

	sessID, err := api.GetSessionID(r)
	if err != nil {
		e.log.Error(r.Context(), "Error getting session ID: %v", err)
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("wrong session id"), time.Now(), r.URL.Path, 0)
		return
	}
	currUser := api.GetUser(r)
	response := map[string]interface{}{"data": nil}

	data, err := e.sessions.GetReplay(projID, sessID, currUser.GetIDAsString())
	if err != nil {
		e.log.Warn(r.Context(), "Error getting replay data: %v", err)
		if strings.Contains(err.Error(), session.NoSession) {
			data, err := e.assist.GetLiveSessionByID(projID, sessID)
			if err != nil {
				e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, time.Now(), r.URL.Path, 0)
				return
			}
			response["data"] = data
		} else {
			// FYI: this is a direct copy of the chalice’s logic for compatibility support.
			e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"errors": []string{"session not found"}}, startTime, r.URL.Path, bodySize)
			return
		}
	} else {
		data.Live, err = e.assist.IsLive(projID, sessID)
		if err != nil {
			e.log.Error(r.Context(), "Error getting live session: %v", err)
		}

		fileKey, err := e.sessions.GetFileKey(sessID)
		if err != nil {
			e.log.Error(r.Context(), "Error getting file key: %v", err)
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("error retrieving file key"), startTime, r.URL.Path, bodySize)
			return
		}
		if fileKey != nil {
			data.FileKey = fileKey
		}

		response["data"] = data
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, response, startTime, r.URL.Path, bodySize)
}

// the original method: get_live_sessions_ws
func (e *handlersImpl) getLiveSessions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &proxy.GetLiveSessionsRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projID, err := api.GetProject(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp, err := e.assist.GetLiveSessionsWS(projID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
	return
}

func (e *handlersImpl) getLiveSession(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetProject(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	sessionID, err := api.GetSessionID(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	data, err := e.assist.GetLiveSessionByID(projID, sessionID)
	if err != nil {
		currUser := api.GetUser(r)

		data, err = e.sessions.GetReplay(projID, sessionID, currUser.GetIDAsString())
		if err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
			return
		}
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": data}, startTime, r.URL.Path, bodySize)
	return
}
