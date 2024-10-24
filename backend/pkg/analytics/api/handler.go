package api

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"io"
	"net/http"
	"strconv"
	"time"
)

func (e *Router) createDashboard(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	bodySize := 0

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
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

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
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

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
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

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
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

	bodyBytes, err := e.readBody(w, r, e.cfg.JsonSizeLimit)
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

func recordMetrics(requestStart time.Time, url string, code, bodySize int) {
	// TODO: Implement this
}

func (e *Router) readBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	bodyBytes, err := io.ReadAll(body)

	// Close body
	if closeErr := body.Close(); closeErr != nil {
		e.log.Warn(r.Context(), "error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func (e *Router) ResponseOK(ctx context.Context, w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	w.WriteHeader(http.StatusOK)
	e.log.Info(ctx, "response ok")
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func (e *Router) ResponseWithJSON(ctx context.Context, w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	e.log.Info(ctx, "response ok")
	body, err := json.Marshal(res)
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.Header().Set("Content-Type", "application/json")
	_, err = w.Write(body)
	if err != nil {
		return
	}
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

type response struct {
	Error string `json:"error"`
}

func (e *Router) ResponseWithError(ctx context.Context, w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	e.log.Error(ctx, "response error, code: %d, error: %s", code, err)
	body, err := json.Marshal(&response{err.Error()})
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.WriteHeader(code)
	_, err = w.Write(body)
	if err != nil {
		return
	}
	recordMetrics(requestStart, url, code, bodySize)
}
