package analytics

import (
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.Postgres
	redis.Redis
	objectstorage.ObjectsConfig
	common.HTTP
	FSDir             string        `env:"FS_DIR,required"`
	ProjectExpiration time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	WorkerID          uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
