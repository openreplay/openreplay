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
	FSDir                   string        `env:"FS_DIR,required"`
	SpotsDir                string        `env:"SPOTS_DIR,default=spots"`
	HTTPHost                string        `env:"HTTP_HOST,default="`
	HTTPPort                string        `env:"HTTP_PORT,required"`
	HTTPTimeout             time.Duration `env:"HTTP_TIMEOUT,default=60s"`
	JsonSizeLimit           int64         `env:"JSON_SIZE_LIMIT,default=1000"`
	UseAccessControlHeaders bool          `env:"USE_CORS,default=false"`
	ProjectExpiration       time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	JWTSecret               string        `env:"JWT_SECRET,required"`
	WorkerID                uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
