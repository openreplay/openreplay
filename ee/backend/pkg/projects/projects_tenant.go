package projects

import (
	"context"
	"errors"
	"fmt"
)

func (c *projectsImpl) GetProjectByKeyAndTenant(projectKey string, tenantId int) (*Project, error) {
	cacheKey := fmt.Sprintf("%s:%d", projectKey, tenantId)
	if proj, ok := c.projectsByKeys.Get(cacheKey); ok {
		return proj.(*Project), nil
	}
	if proj, err := c.cache.GetByKey(projectKey); err == nil && proj.TenantID == tenantId {
		c.projectsByKeys.Set(cacheKey, proj)
		return proj, nil
	}
	p, err := c.getProjectByKeyAndTenant(projectKey, tenantId)
	if err != nil {
		return nil, err
	}
	c.projectsByKeys.Set(cacheKey, p)
	if err := c.cache.Set(p); err != nil && !errors.Is(err, ErrDisabledCache) {
		ctx := context.WithValue(context.Background(), "projectKey", projectKey)
		c.log.Error(ctx, "failed to cache project: %s", err)
	}
	return p, nil
}

func (c *projectsImpl) getProjectByKeyAndTenant(projectKey string, tenantId int) (*Project, error) {
	p := &Project{ProjectKey: projectKey, TenantID: tenantId}
	if err := c.db.QueryRow(`
		SELECT project_id, name, max_session_duration, save_request_payloads, sample_rate, beacon_size, platform,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
		FROM projects
		WHERE project_key=$1 AND tenant_id=$2 AND active = true
	`,
		projectKey, tenantId,
	).Scan(&p.ProjectID, &p.Name, &p.MaxSessionDuration, &p.SaveRequestPayloads, &p.SampleRate, &p.BeaconSize, &p.Platform,
		&p.Metadata1, &p.Metadata2, &p.Metadata3, &p.Metadata4, &p.Metadata5,
		&p.Metadata6, &p.Metadata7, &p.Metadata8, &p.Metadata9, &p.Metadata10); err != nil {
		return nil, err
	}
	return p, nil
}

func (c *projectsImpl) ExistsByName(name string, tenantID int) (bool, error) {
	return c.existsByNameForTenant(name, tenantID)
}

func (c *projectsImpl) ListProjectsByTenantID(tenantID int) ([]*Project, error) {
	return c.listProjectsByTenantID(tenantID)
}

func (c *projectsImpl) CreateProject(tenantID int, name string, platform string) (*Project, error) {
	return c.createProject(tenantID, name, platform)
}
