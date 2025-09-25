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
	if proj, err := c.cache.GetByKey(projectKey); err == nil {
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
	p := &Project{ProjectKey: projectKey}
	if err := c.db.QueryRow(`
		SELECT project_id, project_key FROM projects
		WHERE project_key=$1 AND tenant_id = $2 AND active = true
	`,
		projectKey, tenantId,
	).Scan(&p.ProjectID, &p.ProjectKey); err != nil {
		return nil, err
	}
	return p, nil
}
