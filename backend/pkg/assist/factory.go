package assist

import (
	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	assistMetrics "openreplay/backend/pkg/metrics/assist"
	"openreplay/backend/pkg/projects"
)

func NewAssist(log logger.Logger, cfg *config.Config, pgconn pool.Pool, redisClient *redis.Client, projects projects.Projects, metrics assistMetrics.Assist) (Assist, error) {
	return newProxy(log, cfg, projects)
}
