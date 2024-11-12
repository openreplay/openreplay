package api

import (
	"context"
	"fmt"
	"net/http"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"time"

	"openreplay/backend/internal/http/services"
)

type handlersImpl struct {
	log      logger.Logger
	services *services.ServicesBuilder
}

func NewHandlers(log logger.Logger, services *services.ServicesBuilder) (api.Handlers, error) {
	return &handlersImpl{
		log:      log,
		services: services,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/tags", e.getTags, "GET"},
	}
}

func (e *handlersImpl) getTags(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// TODO: move check authorization into middleware (we gonna have 2 different auth middlewares)
	sessionData, err := e.services.Tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}
	sessInfo, err := e.services.Sessions.Get(sessionData.ID)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Add sessionID and projectID to context
	r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", sessInfo.ProjectID)))

	// Get tags
	tags, err := e.services.Tags.Get(sessInfo.ProjectID)
	if err != nil {
		api.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	type UrlResponse struct {
		Tags interface{} `json:"tags"`
	}
	api.ResponseWithJSON(e.log, r.Context(), w, &UrlResponse{Tags: tags}, startTime, r.URL.Path, bodySize)
}
