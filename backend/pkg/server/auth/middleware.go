package auth

import (
	"fmt"
	"net/http"
	"strings"

	ctxStore "github.com/docker/distribution/context"

	"openreplay/backend/pkg/server/api"
	user2 "openreplay/backend/pkg/server/user"
)

func (a *authImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString, err := getTokenString(r.Header.Get("Authorization"))
		if err != nil {
			a.log.Warn(r.Context(), "Unauthorized request: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if a.isApiKeyRequest(r) {
			projectKey, err := api.GetParam(r, "project")
			if err != nil {
				a.log.Warn(r.Context(), "Unauthorized request, missing project key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			tenant, err := a.isAuthorizedApiKey(tokenString, projectKey)
			if err != nil {
				a.log.Warn(r.Context(), "Unauthorized request, wrong api key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"tenantData": tenant}))
			next.ServeHTTP(w, r)
			return
		}

		var (
			secret    = a.secret
			tokenType = user2.AuthToken
		)

		if api.IsExtensionRequest(r) {
			secret = a.extensionSecret
			tokenType = user2.SpotToken
		}

		user, err := a.users.Get(tokenString, secret, tokenType)
		if err != nil {
			if a.keys == nil || !api.IsSpotKeyRequest(r) {
				a.log.Warn(r.Context(), "Unauthorized request, wrong jwt token: %s", err)
				w.WriteHeader(http.StatusForbidden)
				return
			}
			user, err = a.keys.IsValid(r.URL.Query().Get("key"))
			if err != nil {
				a.log.Warn(r.Context(), "Unauthorized request, wrong public key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"userData": user}))
		next.ServeHTTP(w, r)
	})
}

func getTokenString(authHeader string) (string, error) {
	if authHeader == "" {
		return "", fmt.Errorf("missing authorization header")
	}
	tokenParts := strings.Split(authHeader, "Bearer ")
	if len(tokenParts) != 2 {
		return "", fmt.Errorf("invalid authorization header")
	}
	return tokenParts[1], nil
}
