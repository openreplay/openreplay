package db

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"time"
)

type Config struct {
	common.Config
	Postgres                   string        `env:"POSTGRES_STRING,required"`
	ProjectExpirationTimeoutMs int64         `env:"PROJECT_EXPIRATION_TIMEOUT_MS,default=1200000"`
	LoggerTimeout              int           `env:"LOG_QUEUE_STATS_INTERVAL_SEC,required"`
	GroupDB                    string        `env:"GROUP_DB,required"`
	TopicRawWeb                string        `env:"TOPIC_RAW_WEB,required"`
	TopicAnalytics             string        `env:"TOPIC_ANALYTICS,required"`
	CommitBatchTimeout         time.Duration `env:"COMMIT_BATCH_TIMEOUT,default=15s"`
	BatchQueueLimit            int           `env:"DB_BATCH_QUEUE_LIMIT,required"`
	BatchSizeLimit             int           `env:"DB_BATCH_SIZE_LIMIT,required"`
	UseQuickwit                bool          `env:"QUICKWIT_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
