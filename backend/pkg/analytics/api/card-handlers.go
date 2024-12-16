package api

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
	"openreplay/backend/pkg/analytics/api/models"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
)

// getCardId returns the ID from the request
func getCardId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	if idStr == "" {
		return 0, fmt.Errorf("invalid Card ID")
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid Card ID")
	}

	return id, nil
}

func (e *handlersImpl) createCard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &models.CardCreateRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	validate := validator.New()
	err = validate.Struct(req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// TODO save card to DB

	resp := &models.CardGetResponse{
		Card: models.Card{
			CardID:    1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			DeletedAt: nil,
			EditedAt:  nil,
			ProjectID: 1,
			UserID:    1,
			CardBase: models.CardBase{
				Name:       req.Name,
				IsPublic:   req.IsPublic,
				Thumbnail:  req.Thumbnail,
				MetricType: req.MetricType,
				MetricOf:   req.MetricOf,
				Series:     req.Series,
			},
		},
	}

	currentUser := r.Context().Value("userData").(*user.User)
	e.log.Info(r.Context(), "User ID: ", currentUser.ID)

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

// getCard
func (e *handlersImpl) getCard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getCardId(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	thumbnail := "https://example.com/image.png"

	// TODO get card from DB

	resp := &models.CardGetResponse{
		Card: models.Card{
			CardID:    id,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			DeletedAt: nil,
			EditedAt:  nil,
			ProjectID: 1,
			UserID:    1,
			CardBase: models.CardBase{
				Name:       "My Card",
				IsPublic:   true,
				Thumbnail:  &thumbnail,
				MetricType: "timeseries",
				MetricOf:   "session_count",
			},
		},
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

// get cards paginated
func (e *handlersImpl) getCards(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// TODO get cards from DB
	thumbnail := "https://example.com/image.png"

	resp := &models.GetCardsResponse{
		Cards: []models.Card{
			{
				CardID:    1,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				DeletedAt: nil,
				EditedAt:  nil,
				ProjectID: 1,
				UserID:    1,
				CardBase: models.CardBase{
					Name:       "My Card",
					IsPublic:   true,
					Thumbnail:  &thumbnail,
					MetricType: "timeseries",
					MetricOf:   "session_count",
				},
			},
		},
		Total: 10,
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updateCard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getCardId(r)
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

	req := &models.CardUpdateRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	validate := validator.New()
	err = validate.Struct(req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// TODO update card in DB

	resp := &models.CardGetResponse{
		Card: models.Card{
			CardID:    id,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			DeletedAt: nil,
			EditedAt:  nil,
			ProjectID: 1,
			UserID:    1,
			CardBase: models.CardBase{
				Name:       req.Name,
				IsPublic:   req.IsPublic,
				Thumbnail:  req.Thumbnail,
				MetricType: req.MetricType,
				MetricOf:   req.MetricOf,
			},
		},
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) deleteCard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	_, err := getCardId(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// TODO delete card from DB

	e.responser.ResponseWithJSON(e.log, r.Context(), w, nil, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getCardChartData(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &models.GetCardChartDataRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	validate := validator.New()
	err = validate.Struct(req)

	// TODO get card chart data from ClickHouse
	jsonInput := `
	{
		"data": [
			{
				"timestamp": 1733934939000,
				"Series A": 100,
				"Series B": 200
			},
			{
				"timestamp": 1733935939000,
				"Series A": 150,
				"Series B": 250
			}
		]
	}`

	var resp models.GetCardChartDataResponse
	err = json.Unmarshal([]byte(jsonInput), &resp)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}
