package api

import (
	"encoding/json"
	"net/http"
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/users"
	"openreplay/backend/pkg/analytics/users/model"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
)

// @title OpenReplay Analytics API
// @version 1.0
// @description API for product analytics - events and users management, querying, and filtering
// @BasePath /api/v1

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	users         users.Users
	jsonSizeLimit int64
}

func (h *handlersImpl) Log() logger.Logger {
	return h.log
}

func (h *handlersImpl) Responser() api.Responser {
	return h.responser
}

func (h *handlersImpl) JsonSizeLimit() int64 {
	return h.jsonSizeLimit
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/{project}/users", "POST", api.AutoRespondWithBody(h, h.searchUsers), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "GET", api.AutoRespond(h, h.getUser), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "DELETE", api.AutoRespond(h, h.deleteUser), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "PUT", api.AutoRespondWithBody(h, h.updateUser), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *common.HTTP, responser api.Responser, users users.Users) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		users:         users,
		jsonSizeLimit: cfg.JsonSizeLimit,
	}, nil
}

// @Summary Search Users
// @Description Search and filter users based on various criteria. Query parameter 'q' performs full-text search across $user_id, $email, and $name fields. Valid values for sortBy and columns are any User field names. Filter operators: is, isAny, isNot, isUndefined, contains, notContains, startsWith, endsWith (strings); =, <, >, <=, >=, != (numbers/dates).
// @Tags Analytics - Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param q query string false "Search query for name, email, or user_id"
// @Param searchUsersRequest body model.SearchUsersRequest true "Search Users Request"
// @Success 200 {object} model.SearchUsersResponse
// @Failure 400 {object} api.ErrorResponse
// @Failure 413 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/users [post]
func (h *handlersImpl) searchUsers(w http.ResponseWriter, r *http.Request, bodyBytes []byte, startTime time.Time, bodySize *int) (*model.SearchUsersResponse, int, error) {
	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	req := &model.SearchUsersRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		return nil, http.StatusBadRequest, err
	}

	if query := r.URL.Query().Get("q"); query != "" {
		req.Query = query
	}

	if err = filters.ValidateStruct(req); err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.users.SearchUsers(r.Context(), projID, req)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	return response, 0, nil
}

// @Summary Get User by UserID
// @Description Retrieve detailed user information by their unique user ID with full profile data.
// @Tags Analytics - Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param userID path string true "User ID"
// @Success 200 {object} model.User
// @Failure 400 {object} api.ErrorResponse
// @Failure 404 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/user/{userID} [get]
func (h *handlersImpl) getUser(w http.ResponseWriter, r *http.Request, startTime time.Time, bodySize *int) (*model.User, int, error) {
	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	userID, err := api.GetPathParam(r, "userID", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.users.GetByUserID(r.Context(), projID, userID)
	if err != nil {
		return nil, http.StatusNotFound, err
	}

	return response, 0, nil
}

// @Summary Delete User
// @Description Permanently delete a user and all associated data. This operation cannot be undone.
// @Tags Analytics - Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param userID path string true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} api.ErrorResponse
// @Failure 404 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/user/{userID} [delete]
func (h *handlersImpl) deleteUser(w http.ResponseWriter, r *http.Request, startTime time.Time, bodySize *int) (map[string]string, int, error) {
	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	userID, err := api.GetPathParam(r, "userID", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	err = h.users.DeleteUser(r.Context(), projID, userID)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	return map[string]string{"message": "user deleted successfully"}, 0, nil
}

// @Summary Update User
// @Description Update user profile information. Partial updates supported - only provided fields are modified. Path parameter userId takes precedence over request body.
// @Tags Analytics - Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param userID path string true "User ID"
// @Param user body model.User true "User Data"
// @Success 200 {object} model.User
// @Failure 400 {object} api.ErrorResponse
// @Failure 404 {object} api.ErrorResponse
// @Failure 500 {object} api.ErrorResponse
// @Router /{project}/user/{userID} [put]
func (h *handlersImpl) updateUser(w http.ResponseWriter, r *http.Request, bodyBytes []byte, startTime time.Time, bodySize *int) (*model.User, int, error) {
	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	userID, err := api.GetPathParam(r, "userID", api.ParseString)
	if err != nil {
		return nil, http.StatusBadRequest, err
	}

	user := &model.User{}
	if err := json.Unmarshal(bodyBytes, user); err != nil {
		return nil, http.StatusBadRequest, err
	}

	user.UserID = userID

	if err = filters.ValidateStruct(user); err != nil {
		return nil, http.StatusBadRequest, err
	}

	response, err := h.users.UpdateUser(r.Context(), projID, user)
	if err != nil {
		return nil, http.StatusNotFound, err
	}

	return response, 0, nil
}
