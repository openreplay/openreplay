package auth

import (
	"fmt"
	"net/http"
	"strconv"

	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/tenant"
	"openreplay/backend/pkg/server/user"
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

func (a *authImpl) validateProjectAccess(r *http.Request, u *user.User) error {
	if a.projects == nil {
		return nil
	}

	projectID, err := api.GetPathParam(r, "projectId", api.ParseUint32, uint32(0))
	if err != nil || projectID == 0 {
		projectID, err = api.GetPathParam(r, "project", api.ParseUint32, uint32(0))
		if err != nil || projectID == 0 {
			return nil
		}
	}

	project, err := a.projects.GetProject(projectID)
	if err != nil {
		return fmt.Errorf("project not found: %w", err)
	}

	if project.TenantID != int(u.TenantID) {
		return fmt.Errorf("project does not belong to user's tenant")
	}

	return nil
}
