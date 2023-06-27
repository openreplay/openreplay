package projects

import (
	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres"
	"time"
)

type Projects interface {
	GetProject(projectID uint32) (*Project, error)
	GetProjectByKey(projectKey string) (*Project, error)
}

type ProjectMeta struct {
	*Project
	expirationTime time.Time
}

type projectsImpl struct {
	db             *postgres.Conn
	projectsByID   cache.Cache
	projectsByKeys cache.Cache
}

func New(db *postgres.Conn) Projects {
	return &projectsImpl{
		db:           db,
		projectsByID: cache.New(time.Minute*5, time.Minute*10),
	}
}

func (c *projectsImpl) GetProject(projectID uint32) (*Project, error) {
	if proj, ok := c.projectsByID.Get(projectID); ok {
		return proj.(*Project), nil
	}
	p, err := c.getProject(projectID)
	if err != nil {
		return nil, err
	}
	c.projectsByID.Set(projectID, p)
	return p, nil
}

func (c *projectsImpl) GetProjectByKey(projectKey string) (*Project, error) {
	if proj, ok := c.projectsByKeys.Get(projectKey); ok {
		return proj.(*Project), nil
	}
	p, err := c.getProjectByKey(projectKey)
	if err != nil {
		return nil, err
	}
	c.projectsByKeys.Set(projectKey, p)
	return p, nil
}
