package data_integration

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/docker/distribution/context"
	"github.com/gorilla/mux"

	integration "openreplay/backend/internal/config/integrations"
	"openreplay/backend/internal/http/util"
	"openreplay/backend/pkg/logger"
	limiter "openreplay/backend/pkg/spot/api"
	"openreplay/backend/pkg/spot/auth"
)

type Router struct {
	log      logger.Logger
	cfg      *integration.Config
	router   *mux.Router
	services *ServiceBuilder
	limiter  *limiter.UserRateLimiter
}

func NewRouter(cfg *integration.Config, log logger.Logger, services *ServiceBuilder) (*Router, error) {
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
		services: services,
		limiter:  limiter.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
	}
	e.init()
	return e, nil
}

func (e *Router) init() {
	e.router = mux.NewRouter()

	// Root route
	e.router.HandleFunc("/", e.ping)

	e.router.HandleFunc("/v1/integrations/{name}/{project}", e.createIntegration).Methods("POST", "OPTIONS")
	e.router.HandleFunc("/v1/integrations/{name}/{project}", e.getIntegration).Methods("GET", "OPTIONS")
	e.router.HandleFunc("/v1/integrations/{name}/{project}", e.updateIntegration).Methods("PATCH", "OPTIONS")
	e.router.HandleFunc("/v1/integrations/{name}/{project}", e.deleteIntegration).Methods("DELETE", "OPTIONS")
	e.router.HandleFunc("/v1/integrations/{name}/{project}/data/{session}", e.getIntegrationData).Methods("GET", "OPTIONS")

	// CORS middleware
	e.router.Use(e.corsMiddleware)
	e.router.Use(e.authMiddleware)
	e.router.Use(e.rateLimitMiddleware)
	e.router.Use(e.actionMiddleware)
}

func (e *Router) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *Router) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			next.ServeHTTP(w, r)
		}
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
		user, err := e.services.Auth.IsAuthorized(r.Header.Get("Authorization"), nil, false)
		if err != nil {
			e.log.Warn(r.Context(), "Unauthorized request: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		r = r.WithContext(context.WithValues(r.Context(), map[string]interface{}{"userData": user}))
		next.ServeHTTP(w, r)
	})
}

func (e *Router) rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			next.ServeHTTP(w, r)
		}
		user := r.Context().Value("userData").(*auth.User)
		rl := e.limiter.GetRateLimiter(user.ID)

		if !rl.Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *statusWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.statusCode == 0 {
		w.statusCode = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

func (e *Router) actionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			next.ServeHTTP(w, r)
		}
		// Read body and restore the io.ReadCloser to its original state
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "can't read body", http.StatusBadRequest)
			return
		}
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		// Use custom response writer to get the status code
		sw := &statusWriter{ResponseWriter: w}
		// Serve the request
		next.ServeHTTP(sw, r)
		e.logRequest(r, bodyBytes, sw.statusCode)
	})
}

func (e *Router) logRequest(r *http.Request, bodyBytes []byte, statusCode int) {
	e.log.Info(r.Context(), "Request: %s %s %s %d", r.Method, r.URL.Path, bodyBytes, statusCode)
}

func (e *Router) GetHandler() http.Handler {
	return e.router
}
