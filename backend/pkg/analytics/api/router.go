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

	// Root route
	e.router.HandleFunc("/", e.ping)

	// Analytics routes
	e.router.HandleFunc("/v1/analytics/{id}", e.getAnalytics).Methods("GET", "OPTIONS")
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
