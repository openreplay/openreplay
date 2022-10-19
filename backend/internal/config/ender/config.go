package ender

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	Postgres                   string `env:"POSTGRES_STRING,required"`
	ProjectExpirationTimeoutMs int64  `env:"PROJECT_EXPIRATION_TIMEOUT_MS,default=1200000"`
	GroupEnder                 string `env:"GROUP_ENDER,required"`
	LoggerTimeout              int    `env:"LOG_QUEUE_STATS_INTERVAL_SEC,required"`
	TopicRawWeb                string `env:"TOPIC_RAW_WEB,required"`
	ProducerTimeout            int    `env:"PRODUCER_TIMEOUT,default=2000"`
	PartitionsNumber           int    `env:"PARTITIONS_NUMBER,required"`
	UseEncryption              bool   `env:"USE_ENCRYPTION,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
