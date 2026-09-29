package auth

import (
	"errors"
	"fmt"
	"net/http"

	"openreplay/backend/pkg/server/api"
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

	_, err = a.projects.GetProjectByKeyAndTenant(projectKey, dbTenant.TenantID)
	if err != nil {
		a.log.Warn(nil, "Unauthorized request, wrong api key: %s", a)
		return nil, err
	}

	return dbTenant, nil
}

func (a *authImpl) isAuthorizedApiKeyOnly(apiKey string) (*tenant.Tenant, error) {
	if a.tenants == nil {
		return nil, fmt.Errorf("tenants service is not configured")
	}
	return a.tenants.GetTenantByApiKey(apiKey)
}

func (a *authImpl) validateProjectAccess(r *http.Request, u *user.User) error {
	if a.projects == nil {
		return nil
	}

	projectID, err := api.GetProject(r)
	if errors.Is(err, api.ErrNoProjectInPath) {
		return nil
	}
	if err != nil {
		return err
	}

	project, err := a.projects.GetProjectNotDeleted(projectID)
	if err != nil {
		return fmt.Errorf("project not found: %w", err)
	}

	if project.TenantID != int(u.TenantID) {
		return fmt.Errorf("project does not belong to user's tenant")
	}

	return nil
}
