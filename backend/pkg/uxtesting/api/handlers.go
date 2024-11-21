package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"openreplay/backend/internal/http/services"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/uxtesting"
)

type handlersImpl struct {
	log           logger.Logger
	JsonSizeLimit int64
	services      *services.ServicesBuilder
}

func NewHandlers(log logger.Logger, jsonSizeLimit int64, services *services.ServicesBuilder) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		JsonSizeLimit: jsonSizeLimit,
		services:      services,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/uxt/signals/test", e.sendUXTestSignal, []string{"POST", "OPTIONS"}},
		{"/v1/web/uxt/signals/task", e.sendUXTaskSignal, []string{"POST", "OPTIONS"}},
		{"/v1/web/uxt/test/{id}", e.getUXTestInfo, []string{"GET", "OPTIONS"}},
		{"/v1/web/uxt/upload-url", e.getUXUploadUrl, []string{"GET", "OPTIONS"}},
	}
}

func (e *handlersImpl) getUXTestInfo(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	sess, err := e.services.Sessions.Get(sessionData.ID)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Add projectID to context
	r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", sess.ProjectID)))

	// Get taskID
	vars := mux.Vars(r)
	id := vars["id"]

	// Get task info
	info, err := e.services.UXTesting.GetInfo(id)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	if sess.ProjectID != info.ProjectID {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, errors.New("project mismatch"), startTime, r.URL.Path, bodySize)
		return
	}
	type TaskInfoResponse struct {
		Task *uxtesting.UXTestInfo `json:"test"`
	}
	api.ResponseWithJSON(e.log, r.Context(), w, &TaskInfoResponse{Task: info}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) sendUXTestSignal(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Add sessionID and projectID to context
	if info, err := e.services.Sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Parse request body
	req := &uxtesting.TestSignal{}

	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	req.SessionID = sessionData.ID

	// Save test signal
	if err := e.services.UXTesting.SetTestSignal(req); err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	api.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) sendUXTaskSignal(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Add sessionID and projectID to context
	if info, err := e.services.Sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Parse request body
	req := &uxtesting.TaskSignal{}

	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	req.SessionID = sessionData.ID

	// Save test signal
	if err := e.services.UXTesting.SetTaskSignal(req); err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	api.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getUXUploadUrl(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Add sessionID and projectID to context
	if info, err := e.services.Sessions.Get(sessionData.ID); err == nil {
		r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", info.ProjectID)))
	}

	key := fmt.Sprintf("%d/ux_webcam_record.webm", sessionData.ID)
	url, err := e.services.ObjStorage.GetPreSignedUploadUrl(key)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	type UrlResponse struct {
		URL string `json:"url"`
	}
	api.ResponseWithJSON(e.log, r.Context(), w, &UrlResponse{URL: url}, startTime, r.URL.Path, bodySize)
}
