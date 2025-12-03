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

func NewRouter(log logger.Logger, cfg *common.HTTP, prefix string, handlers []Handlers, middlewares []RouterMiddleware) (Router, error) {
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
	for _, m := range middlewares {
		if m != nil {
			e.router.Use(m.Middleware)
		}
	}
	e.addHandlers(prefix, handlers)
	return e, nil
}

func (e *routerImpl) addHandlers(prefix string, handlers []Handlers) {
	e.router.HandleFunc("/", e.health)
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

func (e *routerImpl) health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}
