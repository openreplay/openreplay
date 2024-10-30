package api

import (
	"fmt"
	"net/http"
	"openreplay/backend/pkg/common"
	"openreplay/backend/pkg/common/api"
	"openreplay/backend/pkg/common/middleware"
	"openreplay/backend/pkg/spot"
	"time"

	spotConfig "openreplay/backend/internal/config/spot"
	"openreplay/backend/pkg/logger"
)

type Router struct {
	*api.Router
	log      logger.Logger
	cfg      *spotConfig.Config
	services *spot.ServicesBuilder
	limiter  *UserRateLimiter
}

func NewRouter(cfg *spotConfig.Config, log logger.Logger, services *spot.ServicesBuilder) (*Router, error) {
	switch {
	case cfg == nil:
		return nil, fmt.Errorf("config is empty")
	case services == nil:
		return nil, fmt.Errorf("services is empty")
	case log == nil:
		return nil, fmt.Errorf("logger is empty")
	}
	e := &Router{
		Router:   api.NewRouter(log),
		log:      log,
		cfg:      cfg,
		services: services,
		limiter:  NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute),
	}
	e.init()
	return e, nil
}

func (e *Router) init() {
	//e.router = mux.NewRouter()

	// Spot routes
	//e.AddRoute("/v1/spots", e.createSpot, "POST")
	//e.AddRoute("/v1/spots/{id}", e.getSpot, "GET")
	//e.AddRoute("/v1/spots/{id}", e.updateSpot, "PATCH")
	e.AddRoute("/v1/spots", e.getSpots, "GET")
	//e.AddRoute("/v1/spots", e.deleteSpots, "DELETE")
	//e.AddRoute("/v1/spots/{id}/comment", e.addComment, "POST")
	//e.AddRoute("/v1/spots/{id}/uploaded", e.uploadedSpot, "POST")
	//e.AddRoute("/v1/spots/{id}/video", e.getSpotVideo, "GET")
	//e.AddRoute("/v1/spots/{id}/public-key", e.getPublicKey, "GET")
	//e.AddRoute("/v1/spots/{id}/public-key", e.updatePublicKey, "PATCH")
	//e.AddRoute("/v1/spots/{id}/status", e.spotStatus, "GET")
	e.AddRoute("/v1/ping", e.ping, "GET")

	excludedPaths := map[string]map[string]bool{
		//"/v1/ping":  {"GET": true},
		//"/v1/spots": {"POST": true},
	}

	authMiddleware := middleware.AuthMiddleware(e.services.Auth, e.log, excludedPaths, getPermissions, nil)
	limiterMiddleware := middleware.RateLimit(common.NewUserRateLimiter(10, 30, 1*time.Minute, 5*time.Minute))
	e.Use(middleware.CORS(e.cfg.UseAccessControlHeaders))
	e.Use(authMiddleware)
	e.Use(limiterMiddleware)
	e.Use(middleware.Action())

	// CORS middleware
	//e.router.Use(e.corsMiddleware)
	//e.router.Use(e.authMiddleware)
	//e.router.Use(e.rateLimitMiddleware)
	//e.router.Use(e.actionMiddleware)
}

func (e *Router) ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

//func (e *Router) corsMiddleware(next http.Handler) http.Handler {
//	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
//		if r.URL.Path == "/" {
//			next.ServeHTTP(w, r)
//		}
//		if e.cfg.UseAccessControlHeaders {
//			// Prepare headers for preflight requests
//			w.Header().Set("Access-Control-Allow-Origin", "*")
//			w.Header().Set("Access-Control-Allow-Methods", "POST,GET,PATCH,DELETE")
//			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,Content-Encoding")
//		}
//		if r.Method == http.MethodOptions {
//			w.Header().Set("Cache-Control", "max-age=86400")
//			w.WriteHeader(http.StatusOK)
//			return
//		}
//		r = r.WithContext(context.WithValues(r.Context(), map[string]interface{}{"httpMethod": r.Method, "url": util.SafeString(r.URL.Path)}))
//
//		next.ServeHTTP(w, r)
//	})
//}

//func (e *Router) authMiddleware(next http.Handler) http.Handler {
//	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
//		if r.URL.Path == "/" {
//			next.ServeHTTP(w, r)
//		}
//		isExtension := false
//		pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
//		if err != nil {
//			e.log.Error(r.Context(), "failed to get path template: %s", err)
//		} else {
//			if pathTemplate == "/v1/ping" ||
//				(pathTemplate == "/v1/spots" && r.Method == "POST") ||
//				(pathTemplate == "/v1/spots/{id}/uploaded" && r.Method == "POST") {
//				isExtension = true
//			}
//		}
//
//		// Check if the request is authorized
//		user, err := e.services.Auth.IsAuthorized(r.Header.Get("Authorization"), getPermissions(r.URL.Path), isExtension)
//		if err != nil {
//			e.log.Warn(r.Context(), "Unauthorized request: %s", err)
//			if !isSpotWithKeyRequest(r) {
//				w.WriteHeader(http.StatusUnauthorized)
//				return
//			}
//
//			user, err = e.services.Keys.IsValid(r.URL.Query().Get("key"))
//			if err != nil {
//				e.log.Warn(r.Context(), "Wrong public key: %s", err)
//				w.WriteHeader(http.StatusUnauthorized)
//				return
//			}
//		}
//
//		r = r.WithContext(context.WithValues(r.Context(), map[string]interface{}{"userData": user}))
//		next.ServeHTTP(w, r)
//	})
//}

//func isSpotWithKeyRequest(r *http.Request) bool {
//	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
//	if err != nil {
//		return false
//	}
//	getSpotPrefix := "/v1/spots/{id}"            // GET
//	addCommentPrefix := "/v1/spots/{id}/comment" // POST
//	getStatusPrefix := "/v1/spots/{id}/status"   // GET
//	if (pathTemplate == getSpotPrefix && r.Method == "GET") ||
//		(pathTemplate == addCommentPrefix && r.Method == "POST") ||
//		(pathTemplate == getStatusPrefix && r.Method == "GET") {
//		return true
//	}
//	return false
//}

//func (e *Router) rateLimitMiddleware(next http.Handler) http.Handler {
//	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
//		if r.URL.Path == "/" {
//			next.ServeHTTP(w, r)
//		}
//		user := r.Context().Value("userData").(*auth.User)
//		rl := e.limiter.GetRateLimiter(user.ID)
//
//		if !rl.Allow() {
//			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
//			return
//		}
//		next.ServeHTTP(w, r)
//	})
//}

//type statusWriter struct {
//	http.ResponseWriter
//	statusCode int
//}
//
//func (w *statusWriter) WriteHeader(statusCode int) {
//	w.statusCode = statusCode
//	w.ResponseWriter.WriteHeader(statusCode)
//}
//
//func (w *statusWriter) Write(b []byte) (int, error) {
//	if w.statusCode == 0 {
//		w.statusCode = http.StatusOK // Default status code is 200
//	}
//	return w.ResponseWriter.Write(b)
//}

//func (e *Router) actionMiddleware(next http.Handler) http.Handler {
//	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
//		if r.URL.Path == "/" {
//			next.ServeHTTP(w, r)
//		}
//		// Read body and restore the io.ReadCloser to its original state
//		bodyBytes, err := io.ReadAll(r.Body)
//		if err != nil {
//			http.Error(w, "can't read body", http.StatusBadRequest)
//			return
//		}
//		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
//		// Use custom response writer to get the status code
//		sw := &statusWriter{ResponseWriter: w}
//		// Serve the request
//		next.ServeHTTP(sw, r)
//		e.logRequest(r, bodyBytes, sw.statusCode)
//	})
//}

//func (e *Router) GetHandler() http.Handler {
//	return e.router
//}
