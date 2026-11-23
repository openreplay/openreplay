package otlp

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.Postgres
	redis.Redis
	common.HTTP
	CollectorURL   string `env:"OTLP_COLLECTOR_URL,default=http://localhost:4318"`
	BodyLimit      int64  `env:"OTLP_BODY_LIMIT,default=4194304"`
	RetentionDays  int    `env:"OTLP_RETENTION_DAYS,default=30"`
	RateLimitBytes int64  `env:"OTLP_RATE_LIMIT_BYTES,default=5242880"`
	RateLimitBurst int64  `env:"OTLP_RATE_LIMIT_BURST,default=20971520"`
	AuthFailPerMin int    `env:"OTLP_AUTH_FAIL_PER_MIN,default=0"`
	AuthFailBurst  int    `env:"OTLP_AUTH_FAIL_BURST,default=20"`
	AuthFailGlobal int    `env:"OTLP_AUTH_FAIL_GLOBAL_PER_SEC,default=0"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
