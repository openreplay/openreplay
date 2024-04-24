package storage

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"time"
)

type Config struct {
	common.Config
	objectstorage.ObjectsConfig
	FSDir                string        `env:"FS_DIR,required"`
	FileSplitSize        int           `env:"FILE_SPLIT_SIZE,required"`
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
	CompressionAlgo      string        `env:"COMPRESSION_ALGO,default=zstd"` // none, gzip, brotli, zstd
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
