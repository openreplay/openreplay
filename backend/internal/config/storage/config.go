package storage

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"time"
)

type Config struct {
	common.Config
	S3Region             string        `env:"AWS_REGION_WEB,required"`
	S3Bucket             string        `env:"S3_BUCKET_WEB,required"`
	FSDir                string        `env:"FS_DIR,required"`
	FileSplitSize        int           `env:"FILE_SPLIT_SIZE,required"`
	FileSplitDuration    time.Duration `env:"FILE_SPLIT_DURATION,default=15s"`
	RetryTimeout         time.Duration `env:"RETRY_TIMEOUT,default=2m"`
	GroupStorage         string        `env:"GROUP_STORAGE,required"`
	TopicTrigger         string        `env:"TOPIC_TRIGGER,required"`
	GroupFailover        string        `env:"GROUP_STORAGE_FAILOVER"`
	TopicFailover        string        `env:"TOPIC_STORAGE_FAILOVER"`
	DeleteTimeout        time.Duration `env:"DELETE_TIMEOUT,default=48h"`
	ProducerCloseTimeout int           `env:"PRODUCER_CLOSE_TIMEOUT,default=15000"`
	UseFailover          bool          `env:"USE_FAILOVER,default=false"`
	MaxFileSize          int64         `env:"MAX_FILE_SIZE,default=524288000"`
	UseSort              bool          `env:"USE_SESSION_SORT,default=true"`
	UseProfiler          bool          `env:"PROFILER_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
