package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/tags"
	"openreplay/backend/pkg/token"
)

type handlersImpl struct {
	log       logger.Logger
	responser *api.Responser
	tokenizer *token.Tokenizer
	sessions  sessions.Sessions
	tags      tags.Tags
}

func NewHandlers(log logger.Logger, responser *api.Responser, tokenizer *token.Tokenizer, sessions sessions.Sessions, tags tags.Tags) (api.Handlers, error) {
	return &handlersImpl{
		log:       log,
		responser: responser,
		tokenizer: tokenizer,
		sessions:  sessions,
		tags:      tags,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/tags", e.getTags, "GET"},
	}
}

func (e *handlersImpl) getTags(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// TODO: move check authorization into middleware (we gonna have 2 different auth middlewares)
	sessionData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if sessionData != nil {
		r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	}
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}
	sessInfo, err := e.sessions.Get(sessionData.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Add sessionID and projectID to context
	r = r.WithContext(context.WithValue(r.Context(), "sessionID", fmt.Sprintf("%d", sessionData.ID)))
	r = r.WithContext(context.WithValue(r.Context(), "projectID", fmt.Sprintf("%d", sessInfo.ProjectID)))

	// Get tags
	tags, err := e.tags.Get(sessInfo.ProjectID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	type UrlResponse struct {
		Tags interface{} `json:"tags"`
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, &UrlResponse{Tags: tags}, startTime, r.URL.Path, bodySize)
}
