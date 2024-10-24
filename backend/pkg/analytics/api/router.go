package api

import (
	"fmt"
	"net/http"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/logger"
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
	//e.router.HandleFunc("/{projectId}/cards/try", e.tryCard).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/try/sessions", e.tryCardSessions).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/try/issues", e.tryCardIssues).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards", e.getCards).Methods("GET")
	//e.router.HandleFunc("/{projectId}/cards", e.createCard).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/search", e.searchCards).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}", e.getCard).Methods("GET")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}/sessions", e.getCardSessions).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}/issues", e.getCardFunnelIssues).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}/issues/{issueId}/sessions", e.getMetricFunnelIssueSessions).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}/errors", e.getCardErrorsList).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}/chart", e.getCardChart).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}", e.updateCard).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}/status", e.updateCardState).Methods("POST")
	//e.router.HandleFunc("/{projectId}/cards/{cardId}", e.deleteCard).Methods("DELETE")
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

type CurrentContext struct {
	UserID int `json:"user_id"`
}

func (e *Router) getCurrentContext(r *http.Request) *CurrentContext {
	// retrieving user info from headers or tokens
	return &CurrentContext{UserID: 1}
}
