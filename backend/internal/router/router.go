package router

import (
	"github.com/gorilla/mux"
	"log"
	"net/http"
	"openreplay/backend/internal/config"
	http2 "openreplay/backend/internal/services"
)

type Router struct {
	router   *mux.Router
	cfg      *config.Config
	services *http2.ServicesBuilder
}

func NewRouter(cfg *config.Config, services *http2.ServicesBuilder) (*Router, error) {
	e := &Router{
		cfg:      cfg,
		services: services,
	}
	e.init()
	return e, nil
}

func (e *Router) init() {
	e.router = mux.NewRouter()

	// Root path
	e.router.HandleFunc("/", e.root)

	handlers := map[string]func(http.ResponseWriter, *http.Request){
		"/v1/web/not-started": e.notStartedHandlerWeb,
		"/v1/web/start":       e.startSessionHandlerWeb,
		"/v1/web/i":           e.pushMessagesHandlerWeb,
		"/v1/ios/start":       e.startSessionHandlerIOS,
		"/v1/ios/i":           e.pushMessagesHandlerIOS,
		"/v1/ios/late":        e.pushLateMessagesHandlerIOS,
		"/v1/ios/images":      e.imagesUploadHandlerIOS,
	}
	prefix := "/ingest"

	for path, handler := range handlers {
		e.router.HandleFunc(path, handler).Methods("POST")
		e.router.HandleFunc(prefix+path, handler).Methods("POST")
	}

	// CORS middleware
	e.router.Use(e.corsMiddleware)
}

func (e *Router) root(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prepare headers for preflight requests
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if r.Method == http.MethodOptions {
			w.Header().Set("Cache-Control", "max-age=86400")
			w.WriteHeader(http.StatusOK)
			return
		}
		log.Printf("Request: %v  -  %v  ", r.Method, r.URL.Path)

		// Serve request
		next.ServeHTTP(w, r)
	})
}

func (e *Router) GetHandler() http.Handler {
	return e.router
}
