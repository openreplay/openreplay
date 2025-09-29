package projectsapi

import (
	"encoding/json"
	"net/http"
	"time"

	"openreplay/backend/pkg/conditions"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"

	"github.com/go-playground/validator/v10"
)

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	jsonSizeLimit int64
	conditions    conditions.Conditions
}

type PostConditionsRequest struct {
	SampleRate         int                       `json:"rate" validate:"min=0,max=100"`
	ConditionalCapture bool                      `json:"conditionalCapture"`
	Conditions         []conditions.ConditionSet `json:"conditions" validate:"dive"`
}

func NewHandlers(log logger.Logger, responser api.Responser, conditions conditions.Conditions) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		conditions:    conditions,
		jsonSizeLimit: 10000, // TODO use config
	}, nil
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{project}/conditions", "GET", e.getConditions, api.NoPermissions, api.DoNotTrack},
		{"/v1/{project}/conditions", "POST", e.postConditions, api.NoPermissions, api.DoNotTrack},
	}
}

func (e *handlersImpl) getConditions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := api.GetProject(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	conditions, err := e.conditions.Get(uint32(projectID))
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, conditions, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) postConditions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	projectID, err := api.GetProject(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &PostConditionsRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}
	req.Conditions = []conditions.ConditionSet{}
	reqValidator := validator.New()
	if err = reqValidator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	response, err := e.conditions.UpdateConditions(uint32(projectID), req.SampleRate, req.ConditionalCapture, req.Conditions)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, response, startTime, r.URL.Path, bodySize)
}
