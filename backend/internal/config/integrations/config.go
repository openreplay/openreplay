package integrations

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.Postgres
	TopicAnalytics string `env:"TOPIC_ANALYTICS,required"`
	TokenSecret    string `env:"TOKEN_SECRET,required"`
	UseProfiler    bool   `env:"PROFILER_ENABLED,default=false"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
