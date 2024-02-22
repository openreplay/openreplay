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
	GroupCanvasVideo   string `env:"GROUP_CANVAS_VIDEO,required"`
	TopicCanvasTrigger string `env:"TOPIC_CANVAS_TRIGGER,required"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
