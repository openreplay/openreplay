package spot

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
	FSDir                 string        `env:"FS_DIR,required"`
	SpotsDir              string        `env:"SPOTS_DIR,default=spots"`
	ProjectExpiration     time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	MinimumStreamDuration int           `env:"MINIMUM_STREAM_DURATION,default=15000"` // 15s
	WorkerID              uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
