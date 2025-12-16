package db

import (
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.Postgres
	common.Clickhouse
	redis.Redis
	ProjectExpiration     time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	LoggerTimeout         int           `env:"LOG_QUEUE_STATS_INTERVAL_SEC,required"`
	GroupDB               string        `env:"GROUP_DB,required"`
	GroupAnalytics        string        `env:"GROUP_ANALYTICS,required"`
	TopicRawWeb           string        `env:"TOPIC_RAW_WEB,required"`
	TopicAnalytics        string        `env:"TOPIC_ANALYTICS,required"`
	TopicRawMobile        string        `env:"TOPIC_RAW_IOS,required"`
	TopicRawAnalytics     string        `env:"TOPIC_RAW_ANALYTICS,required"`
	CommitBatchTimeout    time.Duration `env:"COMMIT_BATCH_TIMEOUT,default=15s"`
	BatchQueueLimit       int           `env:"DB_BATCH_QUEUE_LIMIT,required"`
	BatchSizeLimit        int           `env:"DB_BATCH_SIZE_LIMIT,required"`
	UseProfiler           bool          `env:"PROFILER_ENABLED,default=false"`
	PAUpdaterStartTime    string        `env:"PA_UPDATER_START_TIME,default=00:00"`
	PAUpdaterEndTime      string        `env:"PA_UPDATER_END_TIME,default=00:00"`
	PAUpdaterTickDuration time.Duration `env:"PA_UPDATER_TICK_DURATION,default=5s"`
	CHReadBatchSizeLimit  int           `env:"CH_READ_BATCH_SIZE_LIMIT,default=50"`
	CHSendBatchSizeLimit  int           `env:"CH_SEND_BATCH_SIZE_LIMIT,default=1000"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
