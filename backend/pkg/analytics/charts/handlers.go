package charts

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/analytics/cards"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
)

func getIDFromRequest(r *http.Request, key string) (int, error) {
	vars := mux.Vars(r)
	idStr := vars[key]
	if idStr == "" {
		return 0, fmt.Errorf("missing %s in request", key)
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, fmt.Errorf("invalid %s format", key)
	}

	return id, nil
}

type SavedCardChartRequest struct {
	StartTimestamp uint64 `json:"startTimestamp" validate:"required,min=946684800000"`
	EndTimestamp   uint64 `json:"endTimestamp" validate:"required,min=946684800000,gtfield=StartTimestamp"`
	Density        int    `json:"density" validate:"required,min=1,max=500"`
	Page           int    `json:"page" validate:"required,min=1"`
	Limit          int    `json:"limit" validate:"required,min=1,max=200"`
	SortBy         string `json:"sortBy"`
	SortOrder      string `json:"sortOrder"`
}

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	jsonSizeLimit int64
	charts        Charts
	cards         cards.Cards
	validator     *validator.Validate
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/{projectId}/cards/try", "POST", e.getCardChartData, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/cards/{id}/chart", "POST", e.getSavedCardChartData, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/cards/{id}/try", "POST", e.getCardChartData, api.NoPermissions, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser api.Responser, charts Charts, cards cards.Cards, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		charts:        charts,
		cards:         cards,
		validator:     validator,
	}, nil
}

func (e *handlersImpl) getSavedCardChartData(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	cardID, err := getIDFromRequest(r, "id")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid card ID format"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	params := &SavedCardChartRequest{}
	if err := json.Unmarshal(bodyBytes, params); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	card, err := e.cards.GetWithSeries(projectID, int64(cardID))
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	req := &model.MetricPayload{
		MetricOf:       card.MetricOf,
		MetricType:     model.MetricType(card.MetricType),
		MetricValue:    card.MetricValue,
		MetricFormat:   card.MetricFormat,
		ViewType:       card.ViewType,
		Name:           card.Name,
		Series:         card.Series,
		StartPoint:     card.StartPoint,
		Exclude:        card.Excludes,
		StartTimestamp: params.StartTimestamp,
		EndTimestamp:   params.EndTimestamp,
		Density:        params.Density,
		Page:           params.Page,
		Limit:          params.Limit,
		SortBy:         params.SortBy,
		SortOrder:      params.SortOrder,
	}

	if err = e.validator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.charts.GetData(projectID, currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getCardChartData(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("Panic:%v\n", rec)
			log.Println("Stack trace:\n" + string(debug.Stack()))
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, fmt.Errorf("panic occurred: %v", rec), time.Now(), r.URL.Path, 0)
		}
	}()
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &model.MetricPayload{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err = e.validator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.charts.GetData(projectID, currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}
