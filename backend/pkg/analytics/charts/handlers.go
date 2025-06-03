package charts

import (
	"encoding/json"
	"fmt"
	"net/http"
	"openreplay/backend/pkg/analytics/cards"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"

	config "openreplay/backend/internal/config/analytics"
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

type handlersImpl struct {
	log           logger.Logger
	responser     *api.Responser
	jsonSizeLimit int64
	charts        Charts
	cards         cards.Cards
	validator     *validator.Validate
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/analytics/{projectId}/cards/try", e.getCardChartData, "POST"},             // for cards itself
		{"/v1/analytics/{projectId}/cards/{id}/chart", e.getSavedCardChartData, "POST"}, // for dashboards
		{"/v1/analytics/{projectId}/cards/{id}/try", e.getCardChartData, "POST"},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser *api.Responser, charts Charts, cards cards.Cards, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		charts:        charts,
		cards:         cards, // Assuming cards is not used in this handler
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

	cardIDStr := mux.Vars(r)["id"]
	cardID, err := strconv.Atoi(cardIDStr)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid card ID format"), startTime, r.URL.Path, bodySize)
		return
	}

	//currentUser := r.Context().Value("userData").(*user.User)

	// get the card from db
	card, err := e.cards.GetWithSeries(projectID, cardID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	if card == nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, fmt.Errorf("card not found"), startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodySize = len(bodyBytes)
	req := &MetricPayload{
		MetricOf:     card.MetricOf,
		MetricType:   MetricType(card.MetricType),
		MetricFormat: card.MetricFormat,
		//Series:   series,
		//MetricType: card.MetricType,
	}

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

func (e *handlersImpl) getCardChartData(w http.ResponseWriter, r *http.Request) {
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

	req := &MetricPayload{}
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
