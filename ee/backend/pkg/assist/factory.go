package assist

import (
	"errors"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/sessionmanager"
)

func NewAssist(log logger.Logger, cfg *config.Config, pgconn pool.Pool, redisClient *redis.Client, projects projects.Projects) (Assist, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is nil")
	case cfg == nil:
		return nil, errors.New("config is nil")
	case projects == nil:
		return nil, errors.New("projects is nil")
	case redisClient == nil || redisClient.Redis == nil:
		return nil, errors.New("redis connection is required for assist")
	}
	sessManager, err := sessionmanager.New(log, cfg.AssistCacheTTL, cfg.AssistBatchSize, cfg.AssistScanSize, redisClient.Redis)
	if err != nil {
		return nil, err
	}
	if _, err := NewAssistStats(log, pgconn, redisClient.Redis); err != nil {
		return nil, err
	}
	sessManager.Start()
	return newDirect(log, cfg, projects, sessManager), nil
}
