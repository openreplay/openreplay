package search

import (
	"encoding/json"
	"fmt"
	"net/http"
	"openreplay/backend/pkg/analytics/model"
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
	search        Search
	validator     *validator.Validate
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{projectId}/sessions/search", "POST", e.getSessions, api.NoPermissions, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser *api.Responser, search Search, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		search:        search,
		validator:     validator,
	}, nil
}

func (e *handlersImpl) getSessions(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &model.SessionsSearchRequest{}
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
	resp, err := e.search.GetAll(projectID, currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}
