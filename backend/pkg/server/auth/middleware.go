package auth

import (
	"net/http"
	"openreplay/backend/pkg/server/api"

	ctxStore "github.com/docker/distribution/context"
)

func (e *authImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			e.log.Warn(r.Context(), "Unauthorized request, missing authorization header")
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if api.IsApiKeyRequest(r) {
			projecKey, err := api.GetParam(r, "project")
			if err != nil {
				e.log.Warn(r.Context(), "Unauthorized request, missing project key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			tenant, err := e.isAuthorizedApiKey(authHeader, projecKey)
			if err != nil {
				e.log.Warn(r.Context(), "Unauthorized request, wrong api key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"tenantData": tenant}))
			next.ServeHTTP(w, r)
			return
		}

		user, err := e.isAuthorized(authHeader)
		if err != nil {
			e.log.Warn(r.Context(), "Unauthorized request, wrong jwt token: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"userData": user}))
		next.ServeHTTP(w, r)
	})
}
