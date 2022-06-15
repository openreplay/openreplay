package sink

import (
	"openreplay/backend/pkg/env"
)

type Config struct {
	FsDir                string
	FsUlimit             uint16
	GroupSink            string
	TopicRawWeb          string
	TopicRawIOS          string
	TopicCache           string
	TopicTrigger         string
	CacheAssets          bool
	AssetsOrigin         string
	ProducerCloseTimeout int
}

func New() *Config {
	return &Config{
		FsDir:                env.String("FS_DIR"),
		FsUlimit:             env.Uint16("FS_ULIMIT"),
		GroupSink:            env.String("GROUP_SINK"),
		TopicRawWeb:          env.String("TOPIC_RAW_WEB"),
		TopicRawIOS:          env.String("TOPIC_RAW_IOS"),
		TopicCache:           env.String("TOPIC_CACHE"),
		TopicTrigger:         env.String("TOPIC_TRIGGER"),
		CacheAssets:          env.Bool("CACHE_ASSETS"),
		AssetsOrigin:         env.String("ASSETS_ORIGIN"),
		ProducerCloseTimeout: 15000,
	}
}
