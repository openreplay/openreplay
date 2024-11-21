package api

import (
	"net/http"
	"time"

	"openreplay/backend/pkg/conditions"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/token"
)

type handlersImpl struct {
	log       logger.Logger
	responser *api.Responser
}

func NewHandlers(log logger.Logger, responser *api.Responser, tokenizer *token.Tokenizer, conditions conditions.Conditions) (api.Handlers, error) {
	return &handlersImpl{
		log:       log,
		responser: responser,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/conditions/{project}", e.getConditions, "GET"},
		{"/v1/mobile/conditions/{project}", e.getConditions, "GET"},
	}
}

func (e *handlersImpl) getConditions(w http.ResponseWriter, r *http.Request) {
	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotImplemented, nil, time.Now(), r.URL.Path, 0)
}
