package projects

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/pkg/errors"

	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/metrics/database"
)

type Cache interface {
	Set(project *Project) error
	GetByID(projectID uint32) (*Project, error)
	GetByKey(projectKey string) (*Project, error)
}

type cacheImpl struct {
	db *redis.Client
}

var ErrDisabledCache = errors.New("cache is disabled")

func (c *cacheImpl) Set(project *Project) error {
	if c.db == nil {
		return ErrDisabledCache
	}
	start := time.Now()
	projectBytes, err := json.Marshal(project)
	if err != nil {
		return err
	}
	if _, err = c.db.Redis.Set(fmt.Sprintf("project:id:%d", project.ProjectID), projectBytes, time.Minute*10).Result(); err != nil {
		return err
	}
	if _, err = c.db.Redis.Set(fmt.Sprintf("project:key:%s", project.ProjectKey), projectBytes, time.Minute*10).Result(); err != nil {
		return err
	}
	database.RecordRedisRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "set", "project")
	database.IncreaseRedisRequests("set", "project")
	return nil
}

func (c *cacheImpl) GetByID(projectID uint32) (*Project, error) {
	if c.db == nil {
		return nil, ErrDisabledCache
	}
	start := time.Now()
	result, err := c.db.Redis.Get(fmt.Sprintf("project:id:%d", projectID)).Result()
	if err != nil {
		return nil, err
	}
	database.RecordRedisRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "get", "project")
	database.IncreaseRedisRequests("get", "project")
	project := &Project{}
	if err = json.Unmarshal([]byte(result), project); err != nil {
		return nil, err
	}
	return project, nil
}

func (c *cacheImpl) GetByKey(projectKey string) (*Project, error) {
	if c.db == nil {
		return nil, ErrDisabledCache
	}
	start := time.Now()
	result, err := c.db.Redis.Get(fmt.Sprintf("project:key:%s", projectKey)).Result()
	if err != nil {
		return nil, err
	}
	database.RecordRedisRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "get", "project")
	database.IncreaseRedisRequests("get", "project")
	project := &Project{}
	if err = json.Unmarshal([]byte(result), project); err != nil {
		return nil, err
	}
	return project, nil
}

func NewCache(db *redis.Client) Cache {
	return &cacheImpl{db: db}
}
