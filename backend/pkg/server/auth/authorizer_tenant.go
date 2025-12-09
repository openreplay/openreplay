package auth

import (
	"fmt"
	"net/http"

	"openreplay/backend/pkg/server/tenant"
	"openreplay/backend/pkg/server/user"
)

func (a *authImpl) isAuthorizedApiKey(apiKey string, projectKey string) (*tenant.Tenant, error) {
	if a.tenants == nil {
		return nil, fmt.Errorf("tenants service is not configured")
	}
	if a.projects == nil {
		return nil, fmt.Errorf("projects service is not configured")
	}

	dbTenant, err := a.tenants.GetTenantByApiKey(apiKey)
	if err != nil {
		return nil, err
	}

	_, err = a.projects.GetProjectByKey(projectKey)
	if err != nil {
		a.log.Warn(nil, "Unauthorized request, wrong api key: %s", a)
		return nil, err
	}

	return dbTenant, nil
}

func (a *authImpl) validateProjectAccess(r *http.Request, u *user.User) error {
	return nil
}
