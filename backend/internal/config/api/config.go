package api

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
	common.Clickhouse
	redis.Redis
	objectstorage.ObjectsConfig
	common.HTTP
	common.RateLimiter
	FSDir                 string        `env:"FS_DIR,required"`
	SpotsDir              string        `env:"SPOTS_DIR,default=spots"`
	ProjectExpiration     time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	MinimumStreamDuration int           `env:"MINIMUM_STREAM_DURATION,default=15000"` // 15s
	AssistUrl             string        `env:"ASSIST_URL,required"`
	AssistKey             string        `env:"ASSIST_KEY,default=assist-secret-key"`
	AssistLiveSuffix      string        `env:"ASSIST_LIVE_SUFFIX,default=/sockets-live"`
	AssistListSuffix      string        `env:"ASSIST_LIST_SUFFIX,default=/sockets-list"`
	AssistRequestTimeout  time.Duration `env:"ASSIST_REQUEST_TIMEOUT,default=5s"`
	AssistJwtSecret       string        `env:"ASSIST_JWT_SECRET,default=secret"`
	AssistJwtAlgorithm    string        `env:"JWT_ALGORITHM,default=HS512"`
	AssistJwtIssuer       string        `env:"JWT_ISSUER,default=openreplay"`
	AssistJwtExpiration   int64         `env:"ASSIST_JWT_EXPIRATION,default=144000"`
	WorkerID              uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
