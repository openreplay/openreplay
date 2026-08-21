package projects

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
)

type Projects interface {
	GetProject(projectID uint32) (*Project, error)
	GetProjectByKey(projectKey string) (*Project, error)
	GetProjectByKeyAndTenant(projectKey string, tenantId int) (*Project, error)
	GetProjectNotDeleted(projectID uint32) (*Project, error)
	ListProjectsByTenantID(tenantID int) ([]*Project, error)
	ExistsByName(name string, tenantID int) (bool, error)
	CreateProject(tenantID int, name string, platform string) (*Project, error)
}

type projectsImpl struct {
	log            logger.Logger
	db             pool.Pool
	cache          Cache
	projectsByID   cache.Cache
	projectsByKeys cache.Cache
	missingKeys    cache.Cache
}

func New(log logger.Logger, db pool.Pool, redis *redis.Client, metrics database.Database) Projects {
	cl := NewCache(redis, metrics)
	return &projectsImpl{
		log:            log,
		db:             db,
		cache:          cl,
		projectsByID:   cache.New(time.Minute*5, time.Minute*10),
		projectsByKeys: cache.New(time.Minute*5, time.Minute*10),
		missingKeys:    cache.New(time.Minute, time.Minute*2),
	}
}

func activeOnly(p *Project) (*Project, error) {
	if !p.Active {
		return nil, pgx.ErrNoRows
	}
	return p, nil
}

func (c *projectsImpl) GetProject(projectID uint32) (*Project, error) {
	p, err := c.getAnyProject(projectID)
	if err != nil {
		return nil, err
	}
	return activeOnly(p)
}

func (c *projectsImpl) GetProjectNotDeleted(projectID uint32) (*Project, error) {
	return c.getAnyProject(projectID)
}

func (c *projectsImpl) getAnyProject(projectID uint32) (*Project, error) {
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
		return activeOnly(proj.(*Project))
	}
	// Negative cache: don't hit PG for every request with an unknown key.
	if _, ok := c.missingKeys.Get(projectKey); ok {
		return nil, pgx.ErrNoRows
	}
	if proj, err := c.cache.GetByKey(projectKey); err == nil {
		c.projectsByKeys.Set(projectKey, proj)
		return activeOnly(proj)
	}
	p, err := c.getProjectByKey(projectKey)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.missingKeys.Set(projectKey, struct{}{})
		}
		return nil, err
	}
	c.projectsByKeys.Set(projectKey, p)
	if err := c.cache.Set(p); err != nil && !errors.Is(err, ErrDisabledCache) {
		ctx := context.WithValue(context.Background(), "projectKey", projectKey)
		c.log.Error(ctx, "failed to cache project: %s", err)
	}
	return activeOnly(p)
}
