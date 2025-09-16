package auth

import (
	"net/http"
	"openreplay/backend/pkg/server/api"

	ctxStore "github.com/docker/distribution/context"
)

func (e *authImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if api.IsApiKeyRequest(r) {
			next.ServeHTTP(w, r)
			return
		}

		user, err := e.isAuthorized(r.Header.Get("Authorization"))
		if err != nil {
			e.log.Warn(r.Context(), "Unauthorized request, wrong jwt token: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"userData": user}))
		next.ServeHTTP(w, r)
	})
}
