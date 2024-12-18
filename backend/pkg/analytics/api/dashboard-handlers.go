package api

import (
	"encoding/json"
	"github.com/go-playground/validator/v10"
	"net/http"
	"openreplay/backend/pkg/analytics/api/models"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
	"time"
)

func (e *handlersImpl) createDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &models.CreateDashboardRequest{}
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
	resp, err := e.service.CreateDashboard(projectID, currentUser.ID, req)

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
	resp, err := e.service.GetDashboards(projectID, u.ID)
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
	res, err := e.service.GetDashboard(projectID, dashboardID, u.ID)
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
	_, err = e.service.GetDashboard(projectID, dashboardID, u.ID)
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

	req := &models.UpdateDashboardRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	currentUser := r.Context().Value("userData").(*user.User)
	resp, err := e.service.UpdateDashboard(projectID, dashboardID, currentUser.ID, req)

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
	_, err = e.service.GetDashboard(projectID, dashboardID, u.ID)
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

	err = e.service.DeleteDashboard(projectID, dashboardID, u.ID)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusInternalServerError, err, startTime, r.URL.Path, bodySize)
		return
	}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) pinDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	//id, err := getDashboardId(r)
	//if err != nil {
	//	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
	//	return
	//}

	e.log.Info(r.Context(), "Dashboard pinned")

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

// add card to dashboard
func (e *handlersImpl) addCardToDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	//id, err := getDashboardId(r)
	//if err != nil {
	//	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
	//	return
	//}

	e.log.Info(r.Context(), "Card added to dashboard")

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}

// remove card from dashboard
func (e *handlersImpl) removeCardFromDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	//id, err := getDashboardId(r)
	//if err != nil {
	//	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
	//	return
	//}

	e.responser.ResponseOK(e.log, r.Context(), w, startTime, r.URL.Path, bodySize)
}
