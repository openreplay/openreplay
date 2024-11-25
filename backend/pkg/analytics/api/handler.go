package api

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
	"strconv"
	"time"
)

func (e *Router) spotTest(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Welcome to NSE Live API"))
}

func (e *Router) createDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := e.ReadBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}
	bodySize = len(bodyBytes)

	req := &CreateDashboardRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &CreateDashboardResponse{
		DashboardID: 1,
	}

	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Router) getDashboard(w http.ResponseWriter, r *http.Request) {

}

func (e *Router) getDashboards(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()
	page := params.Get("page")
	limit := params.Get("limit")
	pageNum, _ := strconv.ParseUint(page, 10, 64)
	limitNum, _ := strconv.ParseUint(limit, 10, 64)

	req := &GetDashboardsRequest{
		Page:     pageNum,
		Limit:    limitNum,
		Order:    params.Get("order"),
		Query:    params.Get("query"),
		FilterBy: params.Get("filterBy"),
	}

	// if err != nil {
	// 	e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, time.Now(), r.URL.Path, 0)
	// 	return
	// }

	fmt.Printf("req: %+v\n", req)

	resp := &GetDashboardsResponse{
		Dashboards: []Dashboard{
			{
				DashboardID: 1,
				Name:        "Dashboard 1",
				Description: "Description 1",
				IsPublic:    true,
				IsPinned:    true,
			},
			{
				DashboardID: 2,
				Name:        "Dashboard 2",
				Description: "Description 2",
				IsPublic:    false,
				IsPinned:    false,
			},
		},
	}

	e.ResponseWithJSON(r.Context(), w, resp, time.Now(), r.URL.Path, 0)
}

func (e *Router) updateDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.ReadBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodySize = len(bodyBytes)

	req := &UpdateDashboardRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &UpdateDashboardResponse{
		DashboardID: id,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Router) deleteDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &DeleteDashboardResponse{
		DashboardID: id,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Router) pinDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &UpdateDashboardResponse{
		DashboardID: id,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Router) addCardToDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.ReadBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodySize = len(bodyBytes)

	req := &UpdateDashboardResponse{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &UpdateDashboardResponse{
		DashboardID: id,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Router) createMetricAndAddToDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.ReadBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodySize = len(bodyBytes)

	req := &UpdateDashboardRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &UpdateDashboardResponse{
		DashboardID: id,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Router) updateWidgetInDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodyBytes, err := e.ReadBody(w, r, e.cfg.JsonSizeLimit)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusRequestEntityTooLarge, err, startTime, r.URL.Path, bodySize)
		return
	}

	bodySize = len(bodyBytes)

	req := &UpdateDashboardRequest{}
	if err := json.Unmarshal(bodyBytes, req); err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &UpdateDashboardResponse{
		DashboardID: id,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func (e *Router) removeWidgetFromDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	id, err := getDashboardId(r)
	if err != nil {
		e.ResponseWithError(r.Context(), w, http.StatusBadRequest, err, startTime, r.URL.Path, bodySize)
		return
	}

	resp := &DeleteDashboardResponse{
		DashboardID: id,
	}
	e.ResponseWithJSON(r.Context(), w, resp, startTime, r.URL.Path, bodySize)
}

func getDashboardId(r *http.Request) (int, error) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["dashboardId"])
	if err != nil {
		return 0, err
	}
	return id, nil
}
