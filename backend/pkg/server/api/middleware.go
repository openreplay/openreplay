package api

import (
	"net/http"

	ctxStore "github.com/docker/distribution/context"
	"openreplay/backend/internal/http/util"
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
