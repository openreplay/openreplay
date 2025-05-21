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
	Get() http.Handler
}

type endpoint struct {
	Permissions []string
	TrackName   string
}

type routerImpl struct {
	log       logger.Logger
	cfg       *common.HTTP
	router    *mux.Router
	endpoints map[string]*endpoint // map[method+path]endpoint
}

func NewRouter(cfg *common.HTTP, log logger.Logger, rateLimiter, authenticator, permissions, tracer RouterMiddleware) (Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	case rateLimiter == nil:
		rateLimiter = NewDefaultMiddleware()
	case authenticator == nil:
		authenticator = NewDefaultMiddleware()
	case permissions == nil:
		permissions = NewDefaultMiddleware()
	case tracer == nil:
		tracer = NewDefaultMiddleware()
	}
	e := &routerImpl{
		log:       log,
		cfg:       cfg,
		router:    mux.NewRouter(),
		endpoints: make(map[string]*endpoint),
	}
	e.router.HandleFunc("/", e.health)
	// Add all middlewares
	e.router.Use(e.healthMiddleware)
	e.router.Use(e.corsMiddleware)
	e.router.Use(rateLimiter.Middleware)
	e.router.Use(authenticator.Middleware)
	e.router.Use(permissions.Middleware)
	e.router.Use(tracer.Middleware)
	return e, nil
}

const NoPrefix = ""

func (e *routerImpl) AddHandlers(prefix string, handlers ...Handlers) {
	for _, handlersSet := range handlers {
		for _, handler := range handlersSet.GetAll() {
			e.router.HandleFunc(handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
			if prefix != NoPrefix {
				e.router.HandleFunc(prefix+handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
			}
			e.endpoints[handler.Method+handler.Path] = &endpoint{
				Permissions: handler.Permissions,
				TrackName:   handler.TrackName,
			}
		}
	}
}

func (e *routerImpl) Get() http.Handler {
	return e.router
}
