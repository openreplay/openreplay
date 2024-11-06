package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"openreplay/backend/internal/http/services"
	"openreplay/backend/pkg/featureflags"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
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
		{"/v1/web/feature-flags", e.featureFlagsHandlerWeb, []string{"POST", "OPTIONS"}},
	}
}

func (e *handlersImpl) featureFlagsHandlerWeb(w http.ResponseWriter, r *http.Request) {
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

	if r.Body == nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, errors.New("request body is empty"), startTime, r.URL.Path, bodySize)
		return
	}
	bodyBytes, err := api.ReadCompressedBody(e.log, w, r, e.JsonSizeLimit)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	// Parse request body
	req := &featureflags.FeatureFlagsRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	computedFlags, err := e.services.FeatureFlags.ComputeFlagsForSession(req)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &featureflags.FeatureFlagsResponse{
		Flags: computedFlags,
	}
	api.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}
