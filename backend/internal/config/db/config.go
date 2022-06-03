package db

import (
	"openreplay/backend/pkg/env"
	"time"
)

type Config struct {
	Postgres                   string
	ProjectExpirationTimeoutMs int64
	LoggerTimeout              int
	GroupDB                    string
	TopicRawWeb                string
	TopicRawIOS                string
	TopicTrigger               string
	CommitBatchTimeout         time.Duration
}

func New() *Config {
	return &Config{
		Postgres:                   env.String("POSTGRES_STRING"),
		ProjectExpirationTimeoutMs: 1000 * 60 * 20,
		LoggerTimeout:              env.Int("LOG_QUEUE_STATS_INTERVAL_SEC"),
		GroupDB:                    env.String("GROUP_DB"),
		TopicRawWeb:                env.String("TOPIC_RAW_WEB"),
		TopicRawIOS:                env.String("TOPIC_RAW_IOS"),
		TopicTrigger:               env.String("TOPIC_TRIGGER"),
		CommitBatchTimeout:         15 * time.Second,
	}
}
