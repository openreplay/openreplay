package auth

import (
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
}

func NewAuth(log logger.Logger, jwtSecret string, users user.Users, tenants tenant.Tenants, projects projects.Projects, extensionSecret *string, keys keys.Keys) (api.RouterMiddleware, error) {
	return &authImpl{
		log:             log,
		secret:          jwtSecret,
		users:           users,
		projects:        projects,
		tenants:         tenants,
		extensionSecret: defaultString(extensionSecret),
		keys:            keys,
	}, nil
}

func defaultString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
