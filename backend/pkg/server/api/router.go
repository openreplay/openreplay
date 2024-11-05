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
	AddHandlers(handlers []*HandlerDescription)
	GetHandler() http.Handler
}

type HandlerDescription struct {
	Path    string
	Handler http.HandlerFunc
	Methods []string
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

	// Root route for health checks
	e.router.HandleFunc("/", e.ping)

	// Common middleware
	e.router.Use(e.corsMiddleware)
	e.router.Use(e.authMiddleware)
	e.router.Use(e.rateLimitMiddleware)
	e.router.Use(e.actionMiddleware)
}

func (e *routerImpl) AddHandlers(handlers []*HandlerDescription) {
	for _, handler := range handlers {
		e.router.HandleFunc(handler.Path, handler.Handler).Methods(handler.Methods...)
	}
}

func (e *routerImpl) GetHandler() http.Handler {
	return e.router
}

func (e *routerImpl) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}
