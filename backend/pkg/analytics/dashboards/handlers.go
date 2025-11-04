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
	responser     api.Responser
	jsonSizeLimit int64
	dashboards    Dashboards
	validator     *validator.Validate
}

func (e *handlersImpl) GetAll() []*api.Description {
	return []*api.Description{
		{"/{projectId}/dashboards", "POST", e.createDashboard, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/dashboards", "GET", e.getDashboards, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/dashboards/{id}", "GET", e.getDashboard, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/dashboards/{id}", "PUT", e.updateDashboard, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/dashboards/{id}", "DELETE", e.deleteDashboard, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/dashboards/{id}/cards", "POST", e.addCardToDashboard, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/dashboards/{id}/widgets/{widgetId}", "DELETE", e.removeCardFromDashboard, api.NoPermissions, api.DoNotTrack},
		{"/{projectId}/dashboards/{id}/widgets/{widgetId}", "PUT", e.updateWidgetPosition, api.NoPermissions, api.DoNotTrack},
	}
}

func NewHandlers(log logger.Logger, cfg *config.Config, responser api.Responser, dashboards Dashboards, validator *validator.Validate) (api.Handlers, error) {
	return &handlersImpl{
		log:           log,
		responser:     responser,
		jsonSizeLimit: cfg.JsonSizeLimit,
		dashboards:    dashboards,
		validator:     validator,
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
	resp, err := e.dashboards.Create(projectID, currentUser.ID, req)

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
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
	resp, err := e.dashboards.GetAll(projectID, u.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp.Dashboards}, startTime, r.URL.Path, bodySize)
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
	resp, err := e.dashboards.Get(projectID, dashboardID, u.ID)
	if err != nil {
		// Map errors to appropriate HTTP status codes
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
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
	_, err = e.dashboards.Get(projectID, dashboardID, u.ID)
	if err != nil {
		// Map errors to appropriate HTTP status codes
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
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
	resp, err := e.dashboards.Update(projectID, dashboardID, currentUser.ID, req)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	// If the request includes metrics, add them as cards to the dashboard
	if len(req.Metrics) > 0 {
		addCardsReq := &AddCardToDashboardRequest{
			MetricIDs: req.Metrics,
			Config:    map[string]interface{}{}, // Default empty config
		}

		err = e.dashboards.AddCards(projectID, dashboardID, currentUser.ID, addCardsReq)
		if err != nil {
			// Log the error but don't fail the entire update operation
			e.log.Error(r.Context(), "Failed to add cards to dashboard during update", "error", err)
		}
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"data": resp}, startTime, r.URL.Path, bodySize)
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
	_, err = e.dashboards.Get(projectID, dashboardID, u.ID)
	if err != nil {
		// Map errors to appropriate HTTP status codes
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	err = e.dashboards.Delete(projectID, dashboardID, u.ID)
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

	if err = e.validator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	err = e.dashboards.AddCards(projectID, dashboardID, u.ID, req)
	if err != nil {
		if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
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

	cardID, err := getIDFromRequest(r, "widgetId")
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	u := r.Context().Value("userData").(*user.User)
	err = e.dashboards.DeleteCard(projectID, dashboardID, u.ID, cardID)
	if err != nil {
		if err.Error() == "not_found: widget not found in dashboard" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updateWidgetPosition(w http.ResponseWriter, r *http.Request) {
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

	widgetID, err := getIDFromRequest(r, "widgetId")
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

	var req UpdateWidgetPositionRequest

	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	if err := e.validator.Struct(req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	u := r.Context().Value("userData").(*user.User)
	err = e.dashboards.UpdateWidgetPosition(projectID, dashboardID, u.ID, widgetID, req.Config)
	if err != nil {
		if err.Error() == "not_found: widget not found in dashboard" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "not_found: dashboard not found" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else if err.Error() == "access_denied: user does not have access" {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusNotFound, err, startTime, r.URL.Path, bodySize)
		} else {
			e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		}
		return
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, map[string]interface{}{"message": "Widget position updated successfully"}, startTime, r.URL.Path, bodySize)
}
