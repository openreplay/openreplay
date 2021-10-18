package cache

import  (
	"time"
	. "openreplay/backend/pkg/db/types"
)

func (c *PGCache) GetProjectByKey(projectKey string) (*Project, error) {
	if c.projectsByKeys[ projectKey ] != nil && 
		time.Now().Before(c.projectsByKeys[ projectKey ].expirationTime) {
		return c.projectsByKeys[ projectKey ].Project, nil
	}
	p, err := c.Conn.GetProjectByKey(projectKey)
	if err != nil {
		return nil, err
	}
	c.projectsByKeys[ projectKey ] = &ProjectMeta{ p, time.Now().Add(c.projectExpirationTimeout) }
	c.projects[ p.ProjectID ] = c.projectsByKeys[ projectKey ]
	return p, nil
}



func (c *PGCache) GetProject(projectID uint32) (*Project, error) {
	if c.projects[ projectID ] != nil && 
		time.Now().Before(c.projects[ projectID ].expirationTime) {
		return c.projects[ projectID ].Project, nil
	}
	p, err := c.Conn.GetProject(projectID)
	if err != nil {
		return nil, err
	}
	c.projects[ projectID ] = &ProjectMeta{ p, time.Now().Add(c.projectExpirationTimeout) }
	c.projectsByKeys[ p.ProjectKey ] = c.projects[ projectID ]
	return p, nil
}

