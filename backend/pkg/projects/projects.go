package projects

import (
	"errors"
	"log"
	"time"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
)

type Projects interface {
	GetProject(projectID uint32) (*Project, error)
	GetProjectByKey(projectKey string) (*Project, error)
}

type projectsImpl struct {
	db             pool.Pool
	cache          Cache
	projectsByID   cache.Cache
	projectsByKeys cache.Cache
}

func New(db pool.Pool, redis *redis.Client) Projects {
	cl := NewCache(redis)
	return &projectsImpl{
		db:             db,
		cache:          cl,
		projectsByID:   cache.New(time.Minute*5, time.Minute*10),
		projectsByKeys: cache.New(time.Minute*5, time.Minute*10),
	}
}

func (c *projectsImpl) GetProject(projectID uint32) (*Project, error) {
	if proj, ok := c.projectsByID.Get(projectID); ok {
		return proj.(*Project), nil
	}
	if proj, err := c.cache.GetByID(projectID); err == nil {
		c.projectsByID.Set(projectID, proj)
		return proj, nil
	}
	p, err := c.getProject(projectID)
	if err != nil {
		return nil, err
	}
	c.projectsByID.Set(projectID, p)
	if err = c.cache.Set(p); err != nil && !errors.Is(err, ErrDisabledCache) {
		log.Printf("Failed to cache project: %v", err)
	}
	return p, nil
}

func (c *projectsImpl) GetProjectByKey(projectKey string) (*Project, error) {
	if proj, ok := c.projectsByKeys.Get(projectKey); ok {
		return proj.(*Project), nil
	}
	if proj, err := c.cache.GetByKey(projectKey); err == nil {
		c.projectsByKeys.Set(projectKey, proj)
		return proj, nil
	}
	p, err := c.getProjectByKey(projectKey)
	if err != nil {
		return nil, err
	}
	c.projectsByKeys.Set(projectKey, p)
	if err := c.cache.Set(p); err != nil && !errors.Is(err, ErrDisabledCache) {
		log.Printf("Failed to cache project: %v", err)
	}
	return p, nil
}
