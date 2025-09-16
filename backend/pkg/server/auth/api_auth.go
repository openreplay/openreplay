package auth

import (
	"net/http"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tenant"

	ctxStore "github.com/docker/distribution/context"
	"github.com/gorilla/mux"
)

type apiAuthImpl struct {
	log      logger.Logger
	tenants  tenant.Tenants
	projects projects.Projects
}

func NewApiAuth(log logger.Logger, tenants tenant.Tenants, projects projects.Projects) (api.RouterMiddleware, error) {
	return &apiAuthImpl{
		log:      log,
		tenants:  tenants,
		projects: projects,
	}, nil
}

func (a *apiAuthImpl) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !api.IsApiKeyRequest(r) {
			next.ServeHTTP(w, r)
			return
		}

		vars := mux.Vars(r)
		projectKey := vars["project"]
		if projectKey == "" {
			a.log.Warn(r.Context(), "Missing projectKey in request path")
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		user, err := a.isAuthorized(r.Header.Get("Authorization"), projectKey)
		if err != nil {
			a.log.Warn(r.Context(), "Unauthorized request, wrong jwt token: %s", err)
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		r = r.WithContext(ctxStore.WithValues(r.Context(), map[string]interface{}{"userData": user}))
		next.ServeHTTP(w, r)
	})
}
