package storage

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"time"
)

type Config struct {
	common.Config
	S3Region      string        `env:"AWS_REGION_WEB,required"`
	S3Bucket      string        `env:"S3_BUCKET_WEB,required"`
	FSDir         string        `env:"FS_DIR,required"`
	FSCleanHRS    int           `env:"FS_CLEAN_HRS,required"`
	FileSplitSize int           `env:"FILE_SPLIT_SIZE,required"`
	RetryTimeout  time.Duration `env:"RETRY_TIMEOUT,default=2m"`
	GroupStorage  string        `env:"GROUP_STORAGE,required"`
	TopicTrigger  string        `env:"TOPIC_TRIGGER,required"`
	DeleteTimeout time.Duration `env:"DELETE_TIMEOUT,default=48h"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
