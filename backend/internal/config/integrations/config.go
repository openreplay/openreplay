package integrations

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	TopicAnalytics string `env:"TOPIC_ANALYTICS,required"`
	PostgresURI    string `env:"POSTGRES_STRING,required"`
	TokenSecret    string `env:"TOKEN_SECRET,required"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
