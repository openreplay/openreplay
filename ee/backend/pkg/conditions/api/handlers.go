package api

import (
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
	responser  *api.Responser
	tokenizer  *token.Tokenizer
	conditions conditions.Conditions
}

func NewHandlers(log logger.Logger, responser *api.Responser, tokenizer *token.Tokenizer, conditions conditions.Conditions) (api.Handlers, error) {
	return &handlersImpl{
		log:        log,
		responser:  responser,
		tokenizer:  tokenizer,
		conditions: conditions,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/conditions/{project}", e.getConditions, "GET"},
		{"/v1/mobile/conditions/{project}", e.getConditions, "GET"},
	}
}

func (e *handlersImpl) getConditions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Check authorization
	_, err := e.tokenizer.ParseFromHTTPRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusUnauthorized, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Get taskID
	vars := mux.Vars(r)
	projID := vars["project"]
	projectID, err := strconv.Atoi(projID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Get task info
	info, err := e.conditions.Get(uint32(projectID))
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}
	e.responser.ResponseWithJSON(e.log, r.Context(), w, info, startTime, r.URL.Path, bodySize)
}
