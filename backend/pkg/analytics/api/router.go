package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/logger"
	"strconv"
	"sync"

	"github.com/gorilla/mux"
)

type Router struct {
	log      logger.Logger
	cfg      *analyticsConfig.Config
	router   *mux.Router
	mutex    *sync.RWMutex
	services *common.ServicesBuilder
}

func NewRouter(cfg *analyticsConfig.Config, log logger.Logger, services *common.ServicesBuilder) (*Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case services == nil:
		return nil, fmt.Errorf("services is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	}
	e := &Router{
		log:      log,
		cfg:      cfg,
		mutex:    &sync.RWMutex{},
		services: services,
	}
	e.init()
	return e, nil
}

func (e *Router) init() {
	e.router = mux.NewRouter()
	e.router.HandleFunc("/", e.ping)
	e.routes()
}

func (e *Router) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) GetHandler() http.Handler {
	return e.router
}

func (e *Router) GetRouter() *mux.Router {
	return e.router
}

func (e *Router) getAnalytics(w http.ResponseWriter, r *http.Request) {
	//w.WriteHeader(http.StatusOK)
	vars := mux.Vars(r)
	id := vars["id"]
	e.log.Info(r.Context(), id)
	w.WriteHeader(http.StatusOK)

	//e.ResponseWithJSON(w, http.StatusOK, map[string]string{"message": "getAnalytics"})
}

func (e *Router) routes() {
	e.router.HandleFunc("/{projectId}/dashboards", e.createDashboard).Methods("POST")
	e.router.HandleFunc("/{projectId}/dashboards", e.getDashboards).Methods("GET")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}", e.getDashboard).Methods("GET")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}", e.updateDashboard).Methods("PUT")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}", e.deleteDashboard).Methods("DELETE")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}/pin", e.pinDashboard).Methods("GET")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}/cards", e.addCardToDashboard).Methods("POST")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}/metrics", e.createMetricAndAddToDashboard).Methods("POST")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}", e.updateWidgetInDashboard).Methods("PUT")
	e.router.HandleFunc("/{projectId}/dashboards/{dashboardId}/widgets/{widgetId}", e.removeWidgetFromDashboard).Methods("DELETE")
	e.router.HandleFunc("/{projectId}/cards/try", e.tryCard).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/try/sessions", e.tryCardSessions).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/try/issues", e.tryCardIssues).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards", e.getCards).Methods("GET")
	e.router.HandleFunc("/{projectId}/cards", e.createCard).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/search", e.searchCards).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}", e.getCard).Methods("GET")
	e.router.HandleFunc("/{projectId}/cards/{cardId}/sessions", e.getCardSessions).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}/issues", e.getCardFunnelIssues).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}/issues/{issueId}/sessions", e.getMetricFunnelIssueSessions).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}/errors", e.getCardErrorsList).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}/chart", e.getCardChart).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}", e.updateCard).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}/status", e.updateCardState).Methods("POST")
	e.router.HandleFunc("/{projectId}/cards/{cardId}", e.deleteCard).Methods("DELETE")
}

// CreateDashboardSchema TODO - refactor this to a separate file
type CreateDashboardSchema struct {
	DashboardID int    `json:"dashboard_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	IsPinned    bool   `json:"is_pinned"`
	Metrics     []int  `json:"metrics"`
}

type CurrentContext struct {
	UserID int `json:"user_id"`
}

// createDashboard TODO - refactor this to a separate service
func (e *Router) createDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId, err := strconv.Atoi(vars["projectId"])
	if err != nil {
		http.Error(w, "Invalid project ID", http.StatusBadRequest)
		return
	}

	fmt.Printf("Received projectId: %s\n", projectId)

	var data CreateDashboardSchema
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	context := e.getCurrentContext(r)
	if context == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fmt.Printf("Received request to create dashboard: %+v\n", data)

	response := map[string]string{
		"message": "Dashboard created successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		return
	}
}

func (e *Router) getCurrentContext(r *http.Request) *CurrentContext {
	// retrieving user info from headers or tokens
	return &CurrentContext{UserID: 1}
}

func (e *Router) getDashboards(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	fmt.Printf("Fetching dashboards for projectId: %s\n", projectId)

	dashboards := []CreateDashboardSchema{
		{DashboardID: 1, Name: "Dashboard 1", Description: "Description 1", IsPublic: true, IsPinned: false, Metrics: []int{1, 2, 3}},
		{DashboardID: 2, Name: "Dashboard 2", Description: "Description 2", IsPublic: false, IsPinned: true, Metrics: []int{4, 5, 6}},
	}

	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(dashboards)
	if err != nil {
		return
	}
}

func (e *Router) getDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	fmt.Printf("Fetching dashboard for projectId: %s, dashboardId: %s\n", projectId, dashboardId)

	dashboard := CreateDashboardSchema{
		DashboardID: 1,
		Name:        "Dashboard 1",
		Description: "Description 1",
		IsPublic:    true,
		IsPinned:    false,
		Metrics:     []int{1, 2, 3},
	}

	w.Header().Set("Content-Type", "application/json")
	err := json.NewEncoder(w).Encode(dashboard)
	if err != nil {
		return
	}
}

func (e *Router) updateDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	fmt.Printf("Updating dashboard %s for project %s", dashboardId, projectId)

	var data CreateDashboardSchema
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Placeholder for updating logic
	w.WriteHeader(http.StatusOK)
	err := json.NewEncoder(w).Encode(map[string]string{"message": "Dashboard updated successfully"})
	if err != nil {
		return
	}
}

func (e *Router) deleteDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	fmt.Printf("Deleting dashboard %s for project %s", dashboardId, projectId)

	// Placeholder for delete logic
	w.WriteHeader(http.StatusNoContent)
}

func (e *Router) pinDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	fmt.Printf("Pinning dashboard %s for project %s", dashboardId, projectId)

	// Placeholder for pinning logic
	w.WriteHeader(http.StatusOK)
	err := json.NewEncoder(w).Encode(map[string]string{"message": "Dashboard pinned successfully"})
	if err != nil {
		return
	}
}

func (e *Router) addCardToDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	fmt.Printf("Adding card to dashboard %s for project %s\n", dashboardId, projectId)

	// Placeholder for adding card logic
	w.WriteHeader(http.StatusCreated)
	err := json.NewEncoder(w).Encode(map[string]string{"message": "Card added to dashboard successfully"})
	if err != nil {
		return
	}
}

func (e *Router) createMetricAndAddToDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	fmt.Printf("Creating metric and adding to dashboard %s for project %s\n", dashboardId, projectId)

	// Placeholder for creating metric logic
	w.WriteHeader(http.StatusCreated)
	err := json.NewEncoder(w).Encode(map[string]string{"message": "Metric created and added to dashboard successfully"})
	if err != nil {
		return
	}
}

func (e *Router) updateWidgetInDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	widgetId := vars["widgetId"]
	fmt.Printf("Updating widget %s in dashboard %s for project %s\n", widgetId, dashboardId, projectId)

	// Placeholder for updating widget logic
	w.WriteHeader(http.StatusOK)
	err := json.NewEncoder(w).Encode(map[string]string{"message": "Widget updated successfully"})
	if err != nil {
		return
	}
}

func (e *Router) removeWidgetFromDashboard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	projectId := vars["projectId"]
	dashboardId := vars["dashboardId"]
	widgetId := vars["widgetId"]
	fmt.Printf("Removing widget %s from dashboard %s for project %s\n", widgetId, dashboardId, projectId)

	// Placeholder for removing widget logic
	w.WriteHeader(http.StatusNoContent)
}

func (e *Router) tryCard(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
}

func (e *Router) tryCardSessions(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
}

func (e *Router) tryCardIssues(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
}

func (e *Router) getCards(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) createCard(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
}

func (e *Router) searchCards(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) getCard(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) getCardSessions(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) getCardFunnelIssues(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) getMetricFunnelIssueSessions(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) getCardErrorsList(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) getCardChart(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) updateCard(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) updateCardState(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) deleteCard(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}
