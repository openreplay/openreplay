package api

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/conditions"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/token"
)

type handlersImpl struct {
	log        logger.Logger
	responser  api.Responser
	tokenizer  *token.Tokenizer
	conditions conditions.Conditions
}

func NewHandlers(log logger.Logger, responser api.Responser, tokenizer *token.Tokenizer, conditions conditions.Conditions) (api.Handlers, error) {
	return &handlersImpl{
		log:        log,
		responser:  responser,
		tokenizer:  tokenizer,
		conditions: conditions,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/conditions/{project}", "GET", e.getConditions, api.NoPermissions, api.DoNotTrack},
		{"/v1/mobile/conditions/{project}", "GET", e.getConditions, api.NoPermissions, api.DoNotTrack},
	}
}

func (e *handlersImpl) getConditions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	tokenData, err := e.tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	projectID, err := strconv.ParseUint(mux.Vars(r)["project"], 10, 32)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	if tokenData.ProjectID == 0 || tokenData.ProjectID != uint32(projectID) {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, errors.New("token doesn't belong to the project"), startTime, r.URL.Path, bodySize)
		return
	}

	info, err := e.conditions.Get(uint32(projectID))
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, info, startTime, r.URL.Path, bodySize)
}
