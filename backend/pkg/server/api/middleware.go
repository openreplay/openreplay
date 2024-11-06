package api

import (
	"bytes"
	"io"
	"net/http"

	ctxStore "github.com/docker/distribution/context"
	"github.com/gorilla/mux"

	"openreplay/backend/internal/http/util"
	auth2 "openreplay/backend/pkg/server/auth"
)

func (e *routerImpl) health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func (e *routerImpl) healthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (e *routerImpl) corsMiddleware(next http.Handler) http.Handler {
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

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"httpMethod": r.Method, "url": util.SafeString(r.URL.Path)}))
		next.ServeHTTP(w, r)
	})
}

func (e *routerImpl) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := e.Auth.IsAuthorized(r.Header.Get("Authorization"), getPermissions(r.URL.Path), e.isExtensionRequest(r))
		if err != nil {
			e.log.Warn(r.Context(), "Unauthorized request: %s", err)
			if !isSpotWithKeyRequest(r) {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			// TODO: remove from here cause it's not related to auth (to some spot endpoints only)
			user, err = e.Keys.IsValid(r.URL.Query().Get("key"))
			if err != nil {
				e.log.Warn(r.Context(), "Wrong public key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"userData": user}))
		next.ServeHTTP(w, r)
	})
}

func (e *routerImpl) isExtensionRequest(r *http.Request) bool {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		e.log.Error(r.Context(), "failed to get path template: %s", err)
	} else {
		if pathTemplate == "/v1/ping" ||
			(pathTemplate == "/v1/spots" && r.Method == "POST") ||
			(pathTemplate == "/v1/spots/{id}/uploaded" && r.Method == "POST") {
			return true
		}
	}
	return false
}

func isSpotWithKeyRequest(r *http.Request) bool {
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		return false
	}
	getSpotPrefix := "/v1/spots/{id}"            // GET
	addCommentPrefix := "/v1/spots/{id}/comment" // POST
	getStatusPrefix := "/v1/spots/{id}/status"   // GET
	if (pathTemplate == getSpotPrefix && r.Method == "GET") ||
		(pathTemplate == addCommentPrefix && r.Method == "POST") ||
		(pathTemplate == getStatusPrefix && r.Method == "GET") {
		return true
	}
	return false
}

func (e *routerImpl) rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userContext := r.Context().Value("userData")
		if userContext == nil {
			// TODO: check what to do in this case (should not happen)
			next.ServeHTTP(w, r)
			return
		}
		user := userContext.(*auth2.User)
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

func (e *routerImpl) actionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
