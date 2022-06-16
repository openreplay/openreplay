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
	TopicAnalytics             string
	CommitBatchTimeout         time.Duration
	BatchQueueLimit            int
	BatchSizeLimit             int
}

func New() *Config {
	return &Config{
		Postgres:                   env.String("POSTGRES_STRING"),
		ProjectExpirationTimeoutMs: 1000 * 60 * 20,
		LoggerTimeout:              env.Int("LOG_QUEUE_STATS_INTERVAL_SEC"),
		GroupDB:                    env.String("GROUP_DB"),
		TopicRawWeb:                env.String("TOPIC_RAW_WEB"),
		TopicAnalytics:             env.String("TOPIC_ANALYTICS"),
		CommitBatchTimeout:         15 * time.Second,
		BatchQueueLimit:            env.Int("BATCH_QUEUE_LIMIT"),
		BatchSizeLimit:             env.Int("BATCH_SIZE_LIMIT"),
	}
}
