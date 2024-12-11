package db

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/logger"
	"time"
)

type Config struct {
	common.Config
	common.Postgres
	common.Clickhouse
	redis.Redis
	ProjectExpiration  time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	LoggerTimeout      int           `env:"LOG_QUEUE_STATS_INTERVAL_SEC,required"`
	GroupDB            string        `env:"GROUP_DB,required"`
	TopicRawWeb        string        `env:"TOPIC_RAW_WEB,required"`
	TopicAnalytics     string        `env:"TOPIC_ANALYTICS,required"`
	TopicRawMobile     string        `env:"TOPIC_RAW_IOS,required"`
	CommitBatchTimeout time.Duration `env:"COMMIT_BATCH_TIMEOUT,default=15s"`
	BatchQueueLimit    int           `env:"DB_BATCH_QUEUE_LIMIT,required"`
	BatchSizeLimit     int           `env:"DB_BATCH_SIZE_LIMIT,required"`
	UseQuickwit        bool          `env:"QUICKWIT_ENABLED,default=false"`
	QuickwitTopic      string        `env:"QUICKWIT_TOPIC,default=saas-quickwit"`
	UseProfiler        bool          `env:"PROFILER_ENABLED,default=false"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
