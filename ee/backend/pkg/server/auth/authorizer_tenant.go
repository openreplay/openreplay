package auth

import (
	"fmt"
	"openreplay/backend/pkg/server/tenant"
)

func (a *authImpl) isAuthorizedApiKey(authHeader string, projectKey string) (*tenant.Tenant, error) {
	if a.tenants == nil {
		return nil, fmt.Errorf("tenants service is not configured")
	}
	if a.projects == nil {
		return nil, fmt.Errorf("projects service is not configured")
	}

	apiKey, err := getTokenString(authHeader)
	if err != nil {
		return nil, err
	}

	dbTenant, err := (*a.tenants).GetTenantByApiKey(apiKey)
	if err != nil {
		return nil, err
	}

	_, err = (*a.projects).GetProjectByKeyAndTenant(projectKey, dbTenant.TenantID)
	if err != nil {
		a.log.Warn(nil, "Unauthorized request, wrong api key: %s", a)
		return nil, err
	}

	return dbTenant, nil
}
