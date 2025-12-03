package auth

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tenant"
	"openreplay/backend/pkg/server/user"
	"openreplay/backend/pkg/spot/keys"
)

type authImpl struct {
	log             logger.Logger
	secret          string
	users           user.Users
	projects        projects.Projects
	tenants         tenant.Tenants
	extensionSecret string
	keys            keys.Keys
	publicEndpoints map[string]struct{} // with PublicKeyPermission
}

func NewAuth(log logger.Logger, jwtSecret string, users user.Users, tenants tenant.Tenants, projects projects.Projects, extensionSecret *string, keys keys.Keys, handlers []api.Handlers) (api.RouterMiddleware, error) {
	res := &authImpl{
		log:             log,
		secret:          jwtSecret,
		users:           users,
		projects:        projects,
		tenants:         tenants,
		extensionSecret: defaultString(extensionSecret),
		keys:            keys,
	}
	res.parsePublicEndpoints(handlers)
	return res, nil
}

func (a *authImpl) parsePublicEndpoints(handlers []api.Handlers) {
	if len(handlers) == 0 {
		return
	}
	a.publicEndpoints = make(map[string]struct{}, len(handlers))
	for _, handlerSet := range handlers {
		for _, handler := range handlerSet.GetAll() {
			for _, perm := range handler.Permissions {
				if perm == api.PublicKeyPermission {
					a.publicEndpoints[handler.Path] = struct{}{}
					continue
				}
			}
		}
	}
}

func (a *authImpl) isApiKeyRequest(r *http.Request) bool {
	if a.publicEndpoints == nil {
		return false
	}
	pathTemplate, err := mux.CurrentRoute(r).GetPathTemplate()
	if err != nil {
		a.log.Warn(context.Background(), "Failed to get path template from request", "path", r.URL.Path, "error", err)
		return false
	}
	for path := range a.publicEndpoints {
		if pathTemplate == path {
			return true
		}
	}
	return false
}

func defaultString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
