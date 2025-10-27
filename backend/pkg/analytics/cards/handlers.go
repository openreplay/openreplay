package cards

import (
	"encoding/json"
	"fmt"
	"net/http"
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
	responser     api.Responser
	jsonSizeLimit int64
	cards         Cards
	validator     *validator.Validate
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{projectId}/cards", "POST", e.createCard, api.NoPermissions, api.DoNotTrack},
		{"/v1/{projectId}/cards", "GET", e.getCardsPaginated, api.NoPermissions, api.DoNotTrack},
		{"/v1/{projectId}/cards/{id}", "GET", e.getCard, api.NoPermissions, api.DoNotTrack},
		{"/v1/{projectId}/cards/{id}", "PUT", e.updateCard, api.NoPermissions, api.DoNotTrack},
		{"/v1/{projectId}/cards/{id}", "POST", e.updateCard, api.NoPermissions, api.DoNotTrack},
		{"/v1/{projectId}/cards/{id}", "DELETE", e.deleteCard, api.NoPermissions, api.DoNotTrack},
		{"/v1/{projectId}/cards/{id}/sessions", "POST", e.getCardSessions, api.NoPermissions, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser api.Responser, cards Cards, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonWithDataSizeLimit,
		cards:         cards,
		validator:     validator,
	}, nil
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

	req := &CardCreateRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err = e.validator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.cards.Create(projectID, currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

// getCard
func (e *handlersImpl) getCard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	id, err := getIDFromRequest(r, "id")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp, err := e.cards.GetWithSeries(projectID, int64(id))
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getCards(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	//currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.cards.GetAll(projectID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getCardsPaginated(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	// Extract projectID from request
	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Parse query parameters
	query := r.URL.Query()

	// Filters
	filters := CardListFilter{
		Filters: make(map[string]interface{}),
	}

	if name := query.Get("name"); name != "" {
		filters.Filters["name"] = name
	}
	if metricType := query.Get("metricType"); metricType != "" {
		filters.Filters["metric_type"] = metricType
	}
	if dashboardIDs := query["dashboard_ids"]; len(dashboardIDs) > 0 {
		// Parse dashboard_ids into []int
		var ids []int
		for _, id := range dashboardIDs {
			if val, err := strconv.Atoi(id); err == nil {
				ids = append(ids, val)
			}
		}
		filters.Filters["dashboard_ids"] = ids
	}

	// Sorting
	sort := CardListSort{
		Field: query.Get("sortField"),
		Order: query.Get("sortOrder"),
	}
	if sort.Field == "" {
		sort.Field = "created_at" // Default sort field
	}
	if sort.Order == "" {
		sort.Order = "desc" // Default sort order
	}

	// Pagination
	limit := 10 // Default limit
	page := 1   // Default page number
	if val := query.Get("limit"); val != "" {
		if l, err := strconv.Atoi(val); err == nil && l > 0 {
			limit = l
		}
	}
	if val := query.Get("page"); val != "" {
		if p, err := strconv.Atoi(val); err == nil && p > 0 {
			page = p
		}
	}
	offset := (page - 1) * limit

	// Validate inputs
	if err := ValidateStruct(filters); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid filters: %w", err), startTime, r.URL.Path, bodySize)
		return
	}
	if err := ValidateStruct(sort); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid sort: %w", err), startTime, r.URL.Path, bodySize)
		return
	}

	// Call the service
	resp, err := e.cards.GetAllPaginated(projectID, filters, sort, limit, offset)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	// Respond with JSON
	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updateCard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	cardId, err := getIDFromRequest(r, "id")
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

	req := &CardUpdateRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err = e.validator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.cards.Update(projectID, int64(cardId), currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) deleteCard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	cardId, err := getIDFromRequest(r, "id")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	err = e.cards.Delete(projectID, int64(cardId), currentUser.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, nil, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getCardSessions(w http.ResponseWriter, r *http.Request) {
	// TODO: implement this
	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotImplemented, fmt.Errorf("not implemented"), time.Now(), r.URL.Path, 0)
}
