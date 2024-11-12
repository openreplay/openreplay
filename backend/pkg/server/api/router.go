package api

import (
	"fmt"
	"net/http"
	"openreplay/backend/pkg/server/keys"

	"github.com/gorilla/mux"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Router interface {
	AddHandlers(handlers ...Handlers)
	GetHandler() http.Handler
	AddMiddlewares(middlewares ...func(http.Handler) http.Handler)
}

type routerImpl struct {
	log    logger.Logger
	cfg    *common.HTTP
	router *mux.Router
	Keys   keys.Keys
}

func NewRouter(cfg *common.HTTP, log logger.Logger, pgconn pool.Pool) (Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	}
	e := &routerImpl{
		log:  log,
		cfg:  cfg,
		Keys: keys.NewKeys(log, pgconn),
	}
	e.init()
	return e, nil
}

func (e *routerImpl) init() {
	e.router = mux.NewRouter()
	e.router.HandleFunc("/", e.health)

	// Default middlewares
	e.router.Use(e.healthMiddleware)
	e.router.Use(e.corsMiddleware)
}

func (e *routerImpl) AddHandlers(handlers ...Handlers) {
	for _, handlersSet := range handlers {
		for _, handler := range handlersSet.GetAll() {
			e.router.HandleFunc(handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
		}
	}
}

// AddHandlerWithPrefix adds a prefix := "/ingest" for http service for example
func (e *routerImpl) AddHandlerWithPrefix(prefix string, handlers Handlers) {
	for _, handler := range handlers.GetAll() {
		e.router.HandleFunc(prefix+handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
	}
}

func (e *routerImpl) GetHandler() http.Handler {
	return e.router
}

func (e *routerImpl) AddMiddlewares(middlewares ...func(http.Handler) http.Handler) {
	for _, middleware := range middlewares {
		e.router.Use(middleware)
	}
}
