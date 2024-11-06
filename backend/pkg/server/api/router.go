package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/auth"
	"openreplay/backend/pkg/spot/service"
)

type Router interface {
	AddHandlers(handlers Handlers)
	GetHandler() http.Handler
}

type routerImpl struct {
	log     logger.Logger
	cfg     *common.HTTP
	router  *mux.Router
	limiter *UserRateLimiter
	Auth    auth.Auth
	Keys    service.Keys
}

func NewRouter(cfg *common.HTTP, log logger.Logger, pgconn pool.Pool) (Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	}
	e := &routerImpl{
		log:     log,
		cfg:     cfg,
		limiter: NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
		Auth:    auth.NewAuth(log, cfg.JWTSecret, cfg.JWTSpotSecret, pgconn),
		Keys:    service.NewKeys(log, pgconn),
	}
	e.init()
	return e, nil
}

func (e *routerImpl) init() {
	e.router = mux.NewRouter()
	e.router.HandleFunc("/", e.health)

	// Common middleware
	e.router.Use(e.healthMiddleware)
	e.router.Use(e.corsMiddleware)
	// Spots, integrations, pa services
	e.router.Use(e.authMiddleware)      // should be different for http service
	e.router.Use(e.rateLimitMiddleware) // can be skipped for some routes
	e.router.Use(e.actionMiddleware)    // should be skipped for some routes
}

func (e *routerImpl) AddHandlers(handlers Handlers) {
	for _, handler := range handlers.GetAll() {
		e.router.HandleFunc(handler.Path, handler.Handler).Methods(handler.Methods...)
	}
}

// AddHandlerWithPrefix adds a prefix := "/ingest" for http service for example
func (e *routerImpl) AddHandlerWithPrefix(prefix string, handlers Handlers) {
	for _, handler := range handlers.GetAll() {
		e.router.HandleFunc(prefix+handler.Path, handler.Handler).Methods(handler.Methods...)
	}
}

func (e *routerImpl) GetHandler() http.Handler {
	return e.router
}
