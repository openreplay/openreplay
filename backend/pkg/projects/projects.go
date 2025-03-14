package projects

import (
	"context"
	"errors"
	"time"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
)

type Projects interface {
	GetProject(projectID uint32) (*Project, error)
	GetProjectByKey(projectKey string) (*Project, error)
}

type projectsImpl struct {
	log            logger.Logger
	db             pool.Pool
	cache          Cache
	projectsByID   cache.Cache
	projectsByKeys cache.Cache
}

func New(log logger.Logger, db pool.Pool, redis *redis.Client, metrics database.Database) Projects {
	cl := NewCache(redis, metrics)
	return &projectsImpl{
		log:            log,
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
		ctx := context.WithValue(context.Background(), "projectID", projectID)
		c.log.Error(ctx, "failed to cache project: %s", err)
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
		ctx := context.WithValue(context.Background(), "projectKey", projectKey)
		c.log.Error(ctx, "failed to cache project: %s", err)
	}
	return p, nil
}
