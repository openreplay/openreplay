package videostorage

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
	TopicRawImages       string        `env:"TOPIC_RAW_IMAGES,required"`
	GroupVideoStorage    string        `env:"GROUP_STORAGE,required"`
	GroupImageStorage    string        `env:"GROUP_IMAGE_STORAGE,required"`
	TopicMobileTrigger   string        `env:"TOPIC_TRIGGER,required"`
	DeleteTimeout        time.Duration `env:"DELETE_TIMEOUT,default=48h"`
	ProducerCloseTimeout int           `env:"PRODUCER_CLOSE_TIMEOUT,default=15000"`
	MaxFileSize          int64         `env:"MAX_FILE_SIZE,default=524288000"`
	UseProfiler          bool          `env:"PROFILER_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
