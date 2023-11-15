package imagestorage

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	FSDir             string `env:"FS_DIR,required"`
	ScreenshotsDir    string `env:"SCREENSHOTS_DIR,default=screenshots"`
	TopicRawImages    string `env:"TOPIC_RAW_IMAGES,required"`
	GroupImageStorage string `env:"GROUP_IMAGE_STORAGE,required"`
	UseProfiler       bool   `env:"PROFILER_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
