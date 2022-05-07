package sink

import (
	"openreplay/backend/pkg/env"
)

type Config struct {
	FsDir       string
	FsUlimit    uint16
	GroupSink   string
	TopicRawWeb string
	TopicRawIOS string
}

func New() *Config {
	return &Config{
		FsDir:       env.String("FS_DIR"),
		FsUlimit:    env.Uint16("FS_ULIMIT"),
		GroupSink:   env.String("GROUP_SINK"),
		TopicRawWeb: env.String("TOPIC_RAW_WEB"),
		TopicRawIOS: env.String("TOPIC_RAW_IOS"),
	}
}
