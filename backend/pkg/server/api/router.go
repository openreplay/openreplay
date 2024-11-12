package api

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/logger"
)

type Router interface {
	AddHandlers(prefix string, handlers ...Handlers)
	AddMiddlewares(middlewares ...func(http.Handler) http.Handler)
	Get() http.Handler
}

type routerImpl struct {
	log    logger.Logger
	cfg    *common.HTTP
	router *mux.Router
}

func NewRouter(cfg *common.HTTP, log logger.Logger) (Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	}
	e := &routerImpl{
		log:    log,
		cfg:    cfg,
		router: mux.NewRouter(),
	}
	e.initRouter()
	return e, nil
}

func (e *routerImpl) initRouter() {
	e.router.HandleFunc("/", e.health)
	// Default middlewares
	e.router.Use(e.healthMiddleware)
	e.router.Use(e.corsMiddleware)
}

const NoPrefix = ""

func (e *routerImpl) AddHandlers(prefix string, handlers ...Handlers) {
	for _, handlersSet := range handlers {
		for _, handler := range handlersSet.GetAll() {
			e.router.HandleFunc(handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
			if prefix != NoPrefix {
				e.router.HandleFunc(prefix+handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
			}
		}
	}
}

func (e *routerImpl) AddMiddlewares(middlewares ...func(http.Handler) http.Handler) {
	for _, middleware := range middlewares {
		e.router.Use(middleware)
	}
}

func (e *routerImpl) Get() http.Handler {
	return e.router
}
