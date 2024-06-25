package spot

import (
	"fmt"
	"github.com/docker/distribution/context"
	"github.com/gorilla/mux"
	"github.com/tomasen/realip"
	"net"
	"net/http"
	spotConfig "openreplay/backend/internal/config/spot"
	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/pkg/logger"
	"sync"
)

type Router struct {
	log      logger.Logger
	cfg      *spotConfig.Config
	router   *mux.Router
	mutex    *sync.RWMutex
	services *ServicesBuilder
}

func NewRouter(cfg *spotConfig.Config, log logger.Logger, services *ServicesBuilder) (*Router, error) {
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

func (e *Router) ExtractGeoData(r *http.Request) *geoip.GeoRecord {
	ip := net.ParseIP(realip.FromRequest(r))
	geoRec, err := e.services.GeoIP.Parse(ip)
	if err != nil {
		e.log.Warn(r.Context(), "failed to parse geo data: %v", err)
	}
	return geoRec
}

func (e *Router) init() {
	e.router = mux.NewRouter()

	// Root route
	e.router.HandleFunc("/", e.root)

	// Spot routes
	e.router.HandleFunc("/v1/spots", e.createSpot).Methods("POST", "OPTIONS")
	e.router.HandleFunc("/v1/spots/{id}", e.getSpot).Methods("GET", "OPTIONS")
	e.router.HandleFunc("/v1/spots/{id}", e.updateSpot).Methods("PATCH", "OPTIONS")
	e.router.HandleFunc("/v1/spots", e.getSpots).Methods("GET", "OPTIONS")
	e.router.HandleFunc("/v1/spots", e.deleteSpots).Methods("DELETE", "OPTIONS")
	e.router.HandleFunc("/v1/spots/{id}/comment", e.addComment).Methods("POST", "OPTIONS")

	// CORS middleware
	e.router.Use(e.corsMiddleware)
	e.router.Use(e.authMiddleware)
	e.router.Use(e.actionMiddleware)
}

func (e *Router) root(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if e.cfg.UseAccessControlHeaders {
			// Prepare headers for preflight requests
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST,GET,PATCH,DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,Content-Encoding")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Cache-Control", "max-age=86400")
			w.WriteHeader(http.StatusOK)
			return
		}
		r = r.WithContext(context.WithValues(r.Context(), map[string]interface{}{"httpMethod": r.Method, "url": util.SafeString(r.URL.Path)}))

		next.ServeHTTP(w, r)
	})
}

func (e *Router) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			next.ServeHTTP(w, r)
		}

		// Check if the request is authorized
		if !e.services.Auth.IsAuthorized(r) {
			e.log.Warn(r.Context(), "Unauthorized request")
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (e *Router) actionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		e.log.Info(r.Context(), "request received: %s", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func (e *Router) GetHandler() http.Handler {
	return e.router
}
