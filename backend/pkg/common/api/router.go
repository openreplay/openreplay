package api

import (
	"context"
	"encoding/json"
	"github.com/gorilla/mux"
	"io"
	"net/http"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/logger"
	"sync"
	"time"
)

type Router struct {
	log      logger.Logger
	router   *mux.Router
	mutex    *sync.RWMutex
	services *common.ServicesBuilder
}

func NewRouter(log logger.Logger, services *common.ServicesBuilder) *Router {
	e := &Router{
		router:   mux.NewRouter(),
		log:      log,
		mutex:    &sync.RWMutex{},
		services: services,
	}

	e.router.HandleFunc("/ping", e.ping).Methods("GET")
	return e
}

// Get return log, router, mutex, services
func (e *Router) Get() (logger.Logger, *mux.Router, *sync.RWMutex, *common.ServicesBuilder) {
	return e.log, e.router, e.mutex, e.services
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

func (e *Router) AddRoute(path string, handler http.HandlerFunc, method string) {
	e.router.HandleFunc(path, handler).Methods(method)
}

func (e *Router) Use(middleware func(http.Handler) http.Handler) {
	e.router.Use(middleware)
}

type CurrentContext struct {
	UserID int `json:"user_id"`
}

func (e *Router) getCurrentContext(r *http.Request) *CurrentContext {
	// retrieving user info from headers or tokens
	return &CurrentContext{UserID: 1}
}

func recordMetrics(requestStart time.Time, url string, code, bodySize int) {
	// TODO: Implement this
}

func (e *Router) ReadBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body := http.MaxBytesReader(w, r.Body, limit)
	bodyBytes, err := io.ReadAll(body)

	// Close body
	if closeErr := body.Close(); closeErr != nil {
		e.log.Warn(r.Context(), "error while closing request body: %s", closeErr)
	}
	if err != nil {
		return nil, err
	}
	return bodyBytes, nil
}

func (e *Router) ResponseOK(ctx context.Context, w http.ResponseWriter, requestStart time.Time, url string, bodySize int) {
	w.WriteHeader(http.StatusOK)
	e.log.Info(ctx, "response ok")
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

func (e *Router) ResponseWithJSON(ctx context.Context, w http.ResponseWriter, res interface{}, requestStart time.Time, url string, bodySize int) {
	e.log.Info(ctx, "response ok")
	body, err := json.Marshal(res)
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.Header().Set("Content-Type", "application/json")
	_, err = w.Write(body)
	if err != nil {
		return
	}
	recordMetrics(requestStart, url, http.StatusOK, bodySize)
}

type response struct {
	Error string `json:"error"`
}

func (e *Router) ResponseWithError(ctx context.Context, w http.ResponseWriter, code int, err error, requestStart time.Time, url string, bodySize int) {
	e.log.Error(ctx, "response error, code: %d, error: %s", code, err)
	body, err := json.Marshal(&response{err.Error()})
	if err != nil {
		e.log.Error(ctx, "can't marshal response: %s", err)
	}
	w.WriteHeader(code)
	_, err = w.Write(body)
	if err != nil {
		return
	}
	recordMetrics(requestStart, url, code, bodySize)
}
