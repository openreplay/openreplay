package cache

import (
	. "openreplay/backend/pkg/db/types"
	"time"
)

func (c *cacheImpl) GetProjectByKey(projectKey string) (*Project, error) {
	pmInterface, found := c.projectsByKeys.Load(projectKey)
	if found {
		if pm, ok := pmInterface.(*ProjectMeta); ok {
			if time.Now().Before(pm.expirationTime) {
				return pm.Project, nil
			}
		}
	}

	p, err := c.conn.GetProjectByKey(projectKey)
	if err != nil {
		return nil, err
	}
	//c.projects[ p.ProjectID ] = &ProjectMeta{ p, time.Now().Add(c.projectExpirationTimeout) }
	c.projectsByKeys.Store(projectKey, p)
	return p, nil
}

func (c *cacheImpl) GetProject(projectID uint32) (*Project, error) {
	if c.projects[projectID] != nil &&
		time.Now().Before(c.projects[projectID].expirationTime) {
		return c.projects[projectID].Project, nil
	}
	p, err := c.conn.GetProject(projectID)
	if err != nil {
		return nil, err
	}
	c.projects[projectID] = &ProjectMeta{p, time.Now().Add(c.projectExpirationTimeout)}
	//c.projectsByKeys.Store(p.ProjectKey, c.projects[ projectID ])
	return p, nil
}
