package dashboards

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
	responser     *api.Responser
	jsonSizeLimit int64
	dashboards    Dashboards
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/v1/analytics/{projectId}/dashboards", e.createDashboard, "POST"},
		{"/v1/analytics/{projectId}/dashboards", e.getDashboards, "GET"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.getDashboard, "GET"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.updateDashboard, "PUT"},
		{"/v1/analytics/{projectId}/dashboards/{id}", e.deleteDashboard, "DELETE"},
		{"/v1/analytics/{projectId}/dashboards/{id}/cards", e.addCardToDashboard, "POST"},
		{"/v1/analytics/{projectId}/dashboards/{id}/cards/{cardId}", e.removeCardFromDashboard, "DELETE"},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser *api.Responser, dashboards Dashboards) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		dashboards:    dashboards,
	}, nil
}

func (e *handlersImpl) createDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &CreateDashboardRequest{}
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

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.dashboards.CreateDashboard(projectID, currentUser.ID, req)

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

// getDashboards
func (e *handlersImpl) getDashboards(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	u := r.Context().Value("userData").(*user.User)
	resp, err := e.dashboards.GetDashboards(projectID, u.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	dashboardID, err := getIDFromRequest(r, "id")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	u := r.Context().Value("userData").(*user.User)
	res, err := e.dashboards.GetDashboard(projectID, dashboardID, u.ID)
	if err != nil {
		// Map errors to appropriate HTTP status codes
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, res, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updateDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	dashboardID, err := getIDFromRequest(r, "id")
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

	u := r.Context().Value("userData").(*user.User)
	_, err = e.dashboards.GetDashboard(projectID, dashboardID, u.ID)
	if err != nil {
		// Map errors to appropriate HTTP status codes
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	req := &UpdateDashboardRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.dashboards.UpdateDashboard(projectID, dashboardID, currentUser.ID, req)

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) deleteDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	dashboardID, err := getIDFromRequest(r, "id")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	u := r.Context().Value("userData").(*user.User)
	_, err = e.dashboards.GetDashboard(projectID, dashboardID, u.ID)
	if err != nil {
		// Map errors to appropriate HTTP status codes
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	err = e.dashboards.DeleteDashboard(projectID, dashboardID, u.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) pinDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	e.log.Info(r.Context(), "Dashboard pinned")

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

// add card to dashboard
func (e *handlersImpl) addCardToDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	dashboardID, err := getIDFromRequest(r, "id")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	u := r.Context().Value("userData").(*user.User)

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodySize = len(bodyBytes)

	req := &AddCardToDashboardRequest{}
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

	err = e.dashboards.AddCardsToDashboard(projectID, dashboardID, u.ID, req)
	if err != nil {
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

// remove card from dashboard
func (e *handlersImpl) removeCardFromDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	projectID, err := getIDFromRequest(r, "projectId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	dashboardID, err := getIDFromRequest(r, "id")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	cardID, err := getIDFromRequest(r, "cardId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	u := r.Context().Value("userData").(*user.User)
	_, err = e.dashboards.GetDashboard(projectID, dashboardID, u.ID)
	if err != nil {
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusForbidden, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
	}

	err = e.dashboards.DeleteCardFromDashboard(dashboardID, cardID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}
