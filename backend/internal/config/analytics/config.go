package analytics

import (
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.Postgres
	common.Clickhouse
	redis.Redis
	common.HTTP
	common.RateLimiter
	FSDir             string        `env:"FS_DIR,required"`
	ProjectExpiration time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	WorkerID          uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	cfg.WorkerID = env.WorkerID()
	return cfg
}
