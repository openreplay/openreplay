package api

import (
	"errors"
	"net/http"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"time"
)

type handlersImpl struct {
	log logger.Logger
}

func NewHandlers(log logger.Logger) (api.Handlers, error) {
	return &handlersImpl{
		log: log,
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/web/conditions/{project}", e.getConditions, []string{"GET", "OPTIONS"}},
		{"/v1/mobile/conditions/{project}", e.getConditions, []string{"GET", "OPTIONS"}},
	}
}

func (e *handlersImpl) getConditions(w http.ResponseWriter, r *http.Request) {
	api.ResponseWithError(e.log, r.Context(), w, http.StatusNotImplemented, errors.New("no support"), time.Now(), r.URL.Path, 0)
}
