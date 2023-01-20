package integrations

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	common.Postgres
	TopicAnalytics string `env:"TOPIC_ANALYTICS,required"`
	TokenSecret    string `env:"TOKEN_SECRET,required"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
