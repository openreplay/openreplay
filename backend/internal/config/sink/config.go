package sink

import (
	"openreplay/backend/internal/config/assets"
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/logger"
	"time"
)

type Config struct {
	common.Config
	assets.Cache
	common.Postgres
	redis.Redis
	FsDir                string        `env:"FS_DIR,required"`
	FsUlimit             uint16        `env:"FS_ULIMIT,required"`
	FileBuffer           int           `env:"FILE_BUFFER,default=16384"`
	SyncTimeout          int           `env:"SYNC_TIMEOUT,default=5"`
	GroupSink            string        `env:"GROUP_SINK,required"`
	TopicRawWeb          string        `env:"TOPIC_RAW_WEB,required"`
	TopicRawMobile       string        `env:"TOPIC_RAW_IOS,required"`
	TopicTrigger         string        `env:"TOPIC_TRIGGER,required"`
	TopicMobileTrigger   string        `env:"TOPIC_MOBILE_TRIGGER,required"`
	AssetsOrigin         string        `env:"ASSETS_ORIGIN,required"`
	ProducerCloseTimeout int           `env:"PRODUCER_CLOSE_TIMEOUT,default=15000"`
	FileSplitTime        time.Duration `env:"FILE_SPLIT_TIME,default=15s"`
	MaxFileSize          int64         `env:"MAX_FILE_SIZE,default=524288000"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
