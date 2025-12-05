package api

import (
	"encoding/json"
	"net/http"

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
	*api.BaseHandler
	users users.Users
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/{project}/users", "POST", api.AutoRespondContextWithBody(h, h.searchUsers), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "GET", api.AutoRespondContext(h, h.getUser), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "DELETE", api.AutoRespondContext(h, h.deleteUser), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "PUT", api.AutoRespondContextWithBody(h, h.updateUser), []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *common.HTTP, responser api.Responser, users users.Users) (api.Handlers, error) {
	return &handlersImpl{
		BaseHandler: api.NewBaseHandler(log, responser, cfg.JsonSizeLimit),
		users:       users,
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
func (h *handlersImpl) searchUsers(ctx *api.RequestContext) (*model.SearchUsersResponse, int, error) {
	projID, err := ctx.GetProjectID()
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	req := &model.SearchUsersRequest{}
	if err := json.Unmarshal(ctx.Body, req); err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to unmarshal search request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if query := ctx.Request.URL.Query().Get("q"); query != "" {
		req.Query = query
	}

	if err = filters.ValidateStruct(req); err != nil {
		h.Log().Error(ctx.Request.Context(), "validation failed for search request: %v", err)
		return nil, http.StatusBadRequest, err
	}

	response, err := h.users.SearchUsers(ctx.Request.Context(), projID, req)
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to search users for project %d: %v", projID, err)
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
func (h *handlersImpl) getUser(ctx *api.RequestContext) (*model.User, int, error) {
	projID, err := ctx.GetProjectID()
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	userID, err := api.GetPathParam(ctx.Request, "userID", api.ParseString)
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get userID parameter: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if userID == "" {
		h.Log().Error(ctx.Request.Context(), "userID cannot be empty")
		return nil, http.StatusBadRequest, http.ErrMissingFile
	}

	response, err := h.users.GetByUserID(ctx.Request.Context(), projID, userID)
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get user %s for project %d: %v", userID, projID, err)
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
func (h *handlersImpl) deleteUser(ctx *api.RequestContext) (map[string]string, int, error) {
	projID, err := ctx.GetProjectID()
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	userID, err := api.GetPathParam(ctx.Request, "userID", api.ParseString)
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get userID parameter: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if userID == "" {
		h.Log().Error(ctx.Request.Context(), "userID cannot be empty")
		return nil, http.StatusBadRequest, http.ErrMissingFile
	}

	err = h.users.DeleteUser(ctx.Request.Context(), projID, userID)
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to delete user %s for project %d: %v", userID, projID, err)
		return nil, http.StatusNotFound, err
	}

	h.Log().Info(ctx.Request.Context(), "successfully deleted user %s for project %d", userID, projID)
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
func (h *handlersImpl) updateUser(ctx *api.RequestContext) (*model.User, int, error) {
	projID, err := ctx.GetProjectID()
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get project ID: %v", err)
		return nil, http.StatusBadRequest, err
	}

	userID, err := api.GetPathParam(ctx.Request, "userID", api.ParseString)
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to get userID parameter: %v", err)
		return nil, http.StatusBadRequest, err
	}

	if userID == "" {
		h.Log().Error(ctx.Request.Context(), "userID cannot be empty")
		return nil, http.StatusBadRequest, http.ErrMissingFile
	}

	user := &model.User{}
	if err := json.Unmarshal(ctx.Body, user); err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to unmarshal user data: %v", err)
		return nil, http.StatusBadRequest, err
	}

	user.UserID = userID

	if err = filters.ValidateStruct(user); err != nil {
		h.Log().Error(ctx.Request.Context(), "validation failed for user data: %v", err)
		return nil, http.StatusBadRequest, err
	}

	response, err := h.users.UpdateUser(ctx.Request.Context(), projID, user)
	if err != nil {
		h.Log().Error(ctx.Request.Context(), "failed to update user %s for project %d: %v", userID, projID, err)
		return nil, http.StatusNotFound, err
	}

	h.Log().Info(ctx.Request.Context(), "successfully updated user %s for project %d", userID, projID)
	return response, 0, nil
}
