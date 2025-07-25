package api

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/pkg/logger"
)

const NoPrefix = ""

type Router interface {
	Get() http.Handler
}

type routerImpl struct {
	log    logger.Logger
	cfg    *common.HTTP
	router *mux.Router
}

func NewRouter(cfg *common.HTTP, log logger.Logger, prefix string, builder ServiceBuilder) (Router, error) {
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
	e.router.HandleFunc("/", e.health)
	e.router.Use(e.healthMiddleware)
	e.router.Use(e.corsMiddleware)
	for _, m := range builder.Middlewares() {
		if m != nil {
			e.router.Use(m.Middleware)
		}
	}
	e.addHandlers(prefix, builder.Handlers()...)
	return e, nil
}

func (e *routerImpl) addHandlers(prefix string, handlers ...Handlers) {
	for _, handlersSet := range handlers {
		for _, handler := range handlersSet.GetAll() {
			e.router.HandleFunc(handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
			if prefix != NoPrefix {
				e.router.HandleFunc(prefix+handler.Path, handler.Handler).Methods(handler.Method, "OPTIONS")
			}
		}
	}
}

func (e *routerImpl) Get() http.Handler {
	return e.router
}
