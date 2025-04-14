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
	ProjectExpiration time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	AssistKey         string        `env:"ASSIST_KEY"`
	WorkerID          uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
