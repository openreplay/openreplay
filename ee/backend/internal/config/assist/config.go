package assist

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
	redis.Redis
	common.HTTP
	common.RateLimiter
	ProjectExpiration time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	AssistKey         string        `env:"ASSIST_KEY"`
	CacheTTL          time.Duration `env:"REDIS_CACHE_TTL,default=5s"`
	BatchSize         int           `env:"REDIS_BATCH_SIZE,default=1000"`
	ScanSize          int64         `env:"REDIS_SCAN_SIZE,default=1000"`
	WorkerID          uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
