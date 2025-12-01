package api

import (
	"encoding/json"
	"net/http"
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/users"
	"openreplay/backend/pkg/users/model"
)

type handlersImpl struct {
	log           logger.Logger
	responser     api.Responser
	users         users.Users
	jsonSizeLimit int64
}

func (h *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/{project}/users", "POST", h.searchUsers, []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "GET", h.getUser, []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "DELETE", h.deleteUser, []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
		{"/{project}/user/{userID}", "PUT", h.updateUser, []string{"DATA_MANAGEMENT"}, api.DoNotTrack},
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
// @Description Search users based on various criteria.
// @Tags Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param searchUsersRequest body model.SearchUsersRequest true "Search Users Request"
// @Success 200 {object} model.SearchUsersResponse
// @Failure 400 {object} api.ErrorResponse "Bad Request"
// @Failure 413 {object} api.ErrorResponse "Request Entity Too Large"
// @Failure 500 {object} api.ErrorResponse "Internal Server Error"
// @Router /{project}/users [post]
func (h *handlersImpl) searchUsers(w http.ResponseWriter, r *http.Request) (*model.SearchUsersResponse, error) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(h.log, w, r, h.jsonSizeLimit)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}
	bodySize = len(bodyBytes)

	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	req := &model.SearchUsersRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	if err = model.ValidateStruct(req); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	response, err := h.users.SearchUsers(projID, req)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return nil, nil
}

// @Summary Get User by UserID
// @Description Retrieve user details by UserID.
// @Tags Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param userID path string true "User ID"
// @Success 200 {object} model.User
// @Failure 400 {object} api.ErrorResponse "Bad Request"
// @Failure 404 {object} api.ErrorResponse "Not Found"
// @Failure 500 {object} api.ErrorResponse "Internal Server Error"
// @Router /{project}/user/{userID} [get]
func (h *handlersImpl) getUser(w http.ResponseWriter, r *http.Request) (*model.User, error) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	userID, err := api.GetPathParam(r, "userID", api.ParseString)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	response, err := h.users.GetByUserID(projID, userID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return nil, nil
}

// @Summary Delete User
// @Description Delete a user by UserID.
// @Tags Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param userID path uint true "User ID"
// @Success 200 {object} model.User
// @Failure 400 {object} api.ErrorResponse "Bad Request"
// @Failure 404 {object} api.ErrorResponse "Not Found"
// @Failure 500 {object} api.ErrorResponse "Internal Server Error"
// @Router /{project}/user/{userID} [delete]
func (h *handlersImpl) deleteUser(w http.ResponseWriter, r *http.Request) (*model.User, error) {
	startTime := time.Now()
	bodySize := 0

	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	userID, err := api.GetPathParam(r, "userID", api.ParseUint32)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	response, err := h.users.DeleteUser(projID, userID)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return nil, nil
}

// @Summary Update User
// @Description Update user details.
// @Tags Users
// @Accept json
// @Produce json
// @Param project path uint true "Project ID"
// @Param userID path uint true "User ID"
// @Param user body model.User true "User Data"
// @Success 200 {object} model.User
// @Failure 400 {object} api.ErrorResponse "Bad Request"
// @Failure 404 {object} api.ErrorResponse "Not Found"
// @Failure 500 {object} api.ErrorResponse "Internal Server Error"
// @Router /{project}/user/{userID} [put]
func (h *handlersImpl) updateUser(w http.ResponseWriter, r *http.Request) (*model.User, error) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(h.log, w, r, h.jsonSizeLimit)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}
	bodySize = len(bodyBytes)

	projID, err := api.GetPathParam(r, "project", api.ParseUint32)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	userID, err := api.GetPathParam(r, "userID", api.ParseString)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	user := &model.User{}
	if err := json.Unmarshal(bodyBytes, user); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	if user.UserID != userID {
		//err := api.NewBadRequestError("User ID in path and body do not match")
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	if err = model.ValidateStruct(user); err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	response, err := h.users.UpdateUser(projID, user)
	if err != nil {
		h.responser.ResponseWithError(h.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		return nil, err
	}

	h.responser.ResponseWithJSON(h.log, r.Context(), w, map[string]interface{}{"data": response}, startTime, r.URL.Path, bodySize)
	return nil, nil
}
