package api

import (
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
	analyticsConfig "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics"
	"openreplay/backend/pkg/logger"
	"sync"
)

type Router struct {
	log      logger.Logger
	cfg      *analyticsConfig.Config
	router   *mux.Router
	mutex    *sync.RWMutex
	services *analytics.ServicesBuilder
}

func NewRouter(cfg *analyticsConfig.Config, log logger.Logger, services *analytics.ServicesBuilder) (*Router, error) {
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

	// Root route
	e.router.HandleFunc("/", e.ping)

	// Analytics routes
	// e.router.HandleFunc("/v1/analytics", e.createAnalytics).Methods("POST", "OPTIONS")
	// e.router.HandleFunc("/v1/analytics/{id}", e.getAnalytics).Methods("GET", "OPTIONS")
	// e.router.HandleFunc("/v1/analytics/{id}", e.updateAnalytics).Methods("PATCH", "OPTIONS")
	// e.router.HandleFunc("/v1/analytics", e.getAnalytics).Methods("GET", "OPTIONS")
}

func (e *Router) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) GetHandler() http.Handler {
	return e.router
}
