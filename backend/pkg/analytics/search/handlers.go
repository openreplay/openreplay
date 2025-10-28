package search

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"

	config "openreplay/backend/internal/config/analytics"
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

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	jsonSizeLimit int64
	search        Search
	validator     *validator.Validate
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/{projectId}/sessions/search", "POST", e.getSessions, []string{"SESSION_REPLAY"}, api.DoNotTrack},
		{"/v1/{project}/sessions/search/ids", "POST", e.getSessionIDs, []string{"SESSION_REPLAY"}, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser api.Responser, search Search, validator *validator.Validate) (api.Handlers, error) {
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

	if req.Bookmarked {
		if req.Page == 0 {
			req.Page = 1
		}
		if req.Limit == 0 {
			req.Limit = 10
		}
		if err = e.validator.Var(req.Page, "required,min=1"); err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
			return
		}
		if err = e.validator.Var(req.Limit, "required,min=1,max=200"); err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
			return
		}
	} else {
		if err = e.validator.Struct(req); err != nil {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
			return
		}
	}

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)

	var resp interface{}
	if req.Bookmarked {
		resp, err = e.search.GetBookmarkedSessions(projectID, currentUser.ID, req)
	} else {
		resp, err = e.search.GetAll(projectID, currentUser.ID, req)
	}

	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

// TODO: to implement
func (e *handlersImpl) getSessionIDs(w http.ResponseWriter, r *http.Request) {
	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotImplemented, errors.New("not implemented"), time.Now(), r.URL.Path, 0)
	return
}
