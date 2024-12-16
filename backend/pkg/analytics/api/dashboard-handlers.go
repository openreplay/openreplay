package models

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
	"strconv"
	"time"
)

func getDashboardId(r *http.Request) (int, error) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	if idStr == "" {
		return 0, fmt.Errorf("invalid dashboard ID")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, fmt.Errorf("invalid dashboard ID")
	}

	return id, nil
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

	resp := &GetDashboardResponse{
		Dashboard: Dashboard{
			DashboardID: 1,
			Name:        req.Name,
			Description: req.Description,
			IsPublic:    req.IsPublic,
			IsPinned:    req.IsPinned,
		},
	}

	currentUser := r.Context().Value("userData").(*user.User)
	e.log.Info(r.Context(), "User ID: ", currentUser.ID)

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

// getDashboards
func (e *handlersImpl) getDashboards(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	//id, err := getDashboardId(r)
	//if err != nil {
	//	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
	//	return
	//}

	resp := &GetDashboardsResponse{
		Dashboards: []Dashboard{
			{
				DashboardID: 1,
				Name:        "Dashboard",
				Description: "Description",
				IsPublic:    true,
				IsPinned:    false,
			},
		},
		Total: 1,
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) getDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &GetDashboardResponse{
		Dashboard: Dashboard{
			DashboardID: id,
			Name:        "Dashboard",
			Description: "Description",
			IsPublic:    true,
			IsPinned:    false,
		},
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) updateDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	//id, err := getDashboardId(r)
	//if err != nil {
	//	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
	//	return
	//}

	bodyBytes, err := api.ReadBody(e.log, w, r, e.jsonSizeLimit)
	if err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &UpdateDashboardRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &GetDashboardResponse{
		Dashboard: Dashboard{
			DashboardID: 1,
			Name:        req.Name,
			Description: req.Description,
			IsPublic:    req.IsPublic,
			IsPinned:    req.IsPinned,
		},
	}

	e.responser.ResponseWithJSON(e.log, r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *handlersImpl) deleteDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	//id, err := getDashboardId(r)
	//if err != nil {
	//	e.responser.ResponseWithError(e.log, r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
	//	return
	//}
	e.log.Info(r.Context(), "Dashboard deleted")

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
