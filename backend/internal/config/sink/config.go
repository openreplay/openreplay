package sink

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	FsDir                string `env:"FS_DIR,required"`
	FsUlimit             uint16 `env:"FS_ULIMIT,required"`
	FileBuffer           int    `env:"FILE_BUFFER,default=16384"`
	SyncTimeout          int    `env:"SYNC_TIMEOUT,default=5"`
	GroupSink            string `env:"GROUP_SINK,required"`
	TopicRawWeb          string `env:"TOPIC_RAW_WEB,required"`
	TopicRawIOS          string `env:"TOPIC_RAW_IOS,required"`
	TopicCache           string `env:"TOPIC_CACHE,required"`
	TopicTrigger         string `env:"TOPIC_TRIGGER,required"`
	TopicMobileTrigger   string `env:"TOPIC_MOBILE_TRIGGER,required"`
	CacheAssets          bool   `env:"CACHE_ASSETS,required"`
	AssetsOrigin         string `env:"ASSETS_ORIGIN,required"`
	ProducerCloseTimeout int    `env:"PRODUCER_CLOSE_TIMEOUT,default=15000"`
	CacheThreshold       int64  `env:"CACHE_THRESHOLD,default=5"`
	CacheExpiration      int64  `env:"CACHE_EXPIRATION,default=120"`
	CacheBlackList       string `env:"CACHE_BLACK_LIST,default="`
	UseProfiler          bool   `env:"PROFILER_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
