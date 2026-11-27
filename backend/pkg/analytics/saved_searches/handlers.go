package saved_searches

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gorilla/mux"

	config "openreplay/backend/internal/config/api"
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

func parseWithStats(r *http.Request, def bool) bool {
	v := r.URL.Query().Get("withStats")
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

func getSearchIDFromRequest(r *http.Request) (string, error) {
	vars := mux.Vars(r)
	searchID := vars["searchId"]
	if searchID == "" {
		return "", fmt.Errorf("missing searchId in request")
	}
	return searchID, nil
}

// handlersImpl serves the saved searches of one scope; D is its payload.
type handlersImpl[D any] struct {
	log           logger.Logger
	responser     api.Responser
	jsonSizeLimit int64
	savedSearches Store[D]
	validator     *validator.Validate
	routes        func(e *handlersImpl[D]) []*api.Description
	// checkData is an optional scope-specific validation of the payload.
	checkData func(data *D) error
}

func (e *handlersImpl[D]) GetAll() []*api.Description {
	return e.routes(e)
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser api.Responser, savedSearches SavedSearches, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl[model.SavedSearchData]{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		savedSearches: savedSearches,
		validator:     validator,
		routes: func(e *handlersImpl[model.SavedSearchData]) []*api.Description {
			return []*api.Description{
				{"/{projectId}/sessions/search/save", "POST", e.saveSearch, []string{api.SESSION_REPLAY}, "add_saved_search"},
				{"/{projectId}/sessions/search/saved", "GET", e.listSavedSearches, []string{api.SESSION_REPLAY}, "get_saved_searches"},
				{"/{projectId}/sessions/search/saved/{searchId}", "GET", e.getSavedSearch, []string{api.SESSION_REPLAY}, "get_saved_search"},
				{"/{projectId}/sessions/search/saved/{searchId}", "PUT", e.updateSavedSearch, []string{api.SESSION_REPLAY}, "update_saved_search"},
				{"/{projectId}/sessions/search/saved/{searchId}", "DELETE", e.deleteSavedSearch, []string{api.SESSION_REPLAY}, "delete_saved_search"},
			}
		},
	}, nil
}

// NewLogsViewsHandlers exposes the same CRUD as the sessions saved searches
// under /{projectId}/logs/views, for the logs scope.
func NewLogsViewsHandlers(log logger.Logger, cfg *config.Config, responser api.Responser, views LogsViews, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl[json.RawMessage]{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		savedSearches: views,
		validator:     validator,
		checkData:     checkJSONObject,
		routes: func(e *handlersImpl[json.RawMessage]) []*api.Description {
			return []*api.Description{
				{"/{projectId}/logs/views", "POST", e.saveSearch, api.NoPermissions, "add_logs_view"},
				{"/{projectId}/logs/views", "GET", e.listSavedSearches, api.NoPermissions, "get_logs_views"},
				{"/{projectId}/logs/views/{searchId}", "GET", e.getSavedSearch, api.NoPermissions, "get_logs_view"},
				{"/{projectId}/logs/views/{searchId}", "PUT", e.updateSavedSearch, api.NoPermissions, "update_logs_view"},
				{"/{projectId}/logs/views/{searchId}", "DELETE", e.deleteSavedSearch, api.NoPermissions, "delete_logs_view"},
			}
		},
	}, nil
}

func checkJSONObject(data *json.RawMessage) error {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(*data, &obj); err != nil || obj == nil {
		return errors.New("data must be a JSON object")
	}
	return nil
}

// decodeRequest parses and validates the body of a save / update request.
func (e *handlersImpl[D]) decodeRequest(body []byte) (*model.SavedSearchRequestOf[D], error) {
	req := &model.SavedSearchRequestOf[D]{}
	if err := json.Unmarshal(body, req); err != nil {
		return nil, err
	}
	if err := e.validator.Struct(req); err != nil {
		return nil, err
	}
	if e.checkData != nil {
		if err := e.checkData(&req.Data); err != nil {
			return nil, err
		}
	}
	return req, nil
}

func (e *handlersImpl[D]) saveSearch(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req, err := e.decodeRequest(bodyBytes)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.savedSearches.Save(projectID, currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl[D]) getSavedSearch(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	searchID, err := getSearchIDFromRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.savedSearches.Get(projectID, currentUser.ID, searchID, parseWithStats(r, true))
	if err != nil {
		if errors.Is(err, ErrSavedSearchNotFound) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
			return
		}
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl[D]) listSavedSearches(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)

	limit := 20
	offset := 0

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		l, err := strconv.Atoi(limitStr)
		if err != nil || l <= 0 {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid limit: %s (must be a positive integer)", limitStr), startTime, r.URL.Path, bodySize)
			return
		}
		if l > 200 {
			l = 200
		}
		limit = l
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		o, err := strconv.Atoi(offsetStr)
		if err != nil || o < 0 {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid offset: %s (must be a non-negative integer)", offsetStr), startTime, r.URL.Path, bodySize)
			return
		}
		offset = o
	}

	sort := "createdAt"
	if s := r.URL.Query().Get("sort"); s != "" {
		switch s {
		case "name", "createdAt", "userName":
			sort = s
		default:
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid sort key: %s (allowed: name, createdAt, userName)", s), startTime, r.URL.Path, bodySize)
			return
		}
	}

	order := "desc"
	if o := strings.ToLower(r.URL.Query().Get("order")); o != "" {
		if o != "asc" && o != "desc" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, fmt.Errorf("invalid order: %s (allowed: asc, desc)", o), startTime, r.URL.Path, bodySize)
			return
		}
		order = o
	}

	withStats := parseWithStats(r, false)

	searches, total, err := e.savedSearches.List(r.Context(), projectID, currentUser.ID, limit, offset, sort, order, withStats)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{
		"data":   searches,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl[D]) updateSavedSearch(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req, err := e.decodeRequest(bodyBytes)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	searchID, err := getSearchIDFromRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.savedSearches.Update(projectID, currentUser.ID, currentUser.IsAdmin(), searchID, req)
	if err != nil {
		if errors.Is(err, ErrSavedSearchNotFound) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
			return
		}
		if errors.Is(err, ErrSavedSearchForbidden) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
			return
		}
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl[D]) deleteSavedSearch(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	searchID, err := getSearchIDFromRequest(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	err = e.savedSearches.Delete(projectID, currentUser.ID, currentUser.IsAdmin(), searchID)
	if err != nil {
		if errors.Is(err, ErrSavedSearchNotFound) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
			return
		}
		if errors.Is(err, ErrSavedSearchForbidden) {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
			return
		}
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": "deleted"}, startTime, r.URL.Path, bodySize)
}
