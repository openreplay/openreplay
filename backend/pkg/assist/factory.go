package assist

import (
	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
)

func NewAssist(log logger.Logger, cfg *config.Config, pgconn pool.Pool, redisClient *redis.Client, projects projects.Projects) (Assist, error) {
	return newProxy(log, cfg, projects)
}
