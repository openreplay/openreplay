package auth

import (
	"fmt"
	"net/http"
	"strings"

	ctxStore "github.com/docker/distribution/context"

	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tenant"
	user2 "openreplay/backend/pkg/server/user"
)

func (a *authImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString, err := getTokenString(r.Header.Get("Authorization"))
		if err != nil && a.keys == nil {
			a.log.Warn(r.Context(), "Unauthorized request: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if a.isApiKeyRequest(r) {
			projectKey, _ := api.GetParam(r, "project")
			var (
				dbTenant *tenant.Tenant
				authErr  error
			)
			if projectKey != "" {
				dbTenant, authErr = a.isAuthorizedApiKey(tokenString, projectKey)
			} else {
				dbTenant, authErr = a.isAuthorizedApiKeyOnly(tokenString)
			}
			if authErr != nil {
				a.log.Warn(r.Context(), "Unauthorized request, wrong api key: %s", authErr)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"tenantData": dbTenant}))
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
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			spotID, parseErr := api.GetPathParam(r, "id", api.ParseUint64)
			if parseErr != nil {
				a.log.Warn(r.Context(), "Unauthorized request, invalid spot id for public key: %s", parseErr)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			user, err = a.keys.IsValid(r.URL.Query().Get("key"), spotID)
			if err != nil {
				a.log.Warn(r.Context(), "Unauthorized request, wrong public key: %s", err)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}

		if err := a.validateProjectAccess(r, user); err != nil {
			a.log.Warn(r.Context(), "Unauthorized request, project access denied: %s", err)
			w.WriteHeader(http.StatusForbidden)
			return
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
