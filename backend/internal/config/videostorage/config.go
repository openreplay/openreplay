package videostorage

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
)

type Config struct {
	common.Config
	objectstorage.ObjectsConfig
	FSDir              string `env:"FS_DIR,required"`
	GroupVideoStorage  string `env:"GROUP_VIDEO_STORAGE,required"`
	TopicMobileTrigger string `env:"TOPIC_MOBILE_TRIGGER,required"`
	VideoReplayFPS     int    `env:"VIDEO_REPLAY_FPS,default=3"`
	UseProfiler        bool   `env:"PROFILER_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
