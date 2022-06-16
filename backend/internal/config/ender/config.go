package ender

import (
	"openreplay/backend/pkg/env"
)

type Config struct {
	Postgres                   string
	ProjectExpirationTimeoutMs int64
	GroupEnder                 string
	LoggerTimeout              int
	TopicRawWeb                string
	ProducerTimeout            int
	PartitionsNumber           int
}

func New() *Config {
	return &Config{
		Postgres:                   env.String("POSTGRES_STRING"),
		ProjectExpirationTimeoutMs: 1000 * 60 * 20,
		GroupEnder:                 env.String("GROUP_ENDER"),
		LoggerTimeout:              env.Int("LOG_QUEUE_STATS_INTERVAL_SEC"),
		TopicRawWeb:                env.String("TOPIC_RAW_WEB"),
		ProducerTimeout:            2000,
		PartitionsNumber:           env.Int("PARTITIONS_NUMBER"),
	}
}
