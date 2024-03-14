package canvas_handler

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	objectstorage.ObjectsConfig
	FSDir              string `env:"FS_DIR,required"`
	CanvasDir          string `env:"CANVAS_DIR,default=canvas"`
	TopicCanvasImages  string `env:"TOPIC_CANVAS_IMAGES,required"`
	TopicCanvasTrigger string `env:"TOPIC_CANVAS_TRIGGER,required"`
	GroupCanvasImage   string `env:"GROUP_CANVAS_IMAGE,required"`
	UseProfiler        bool   `env:"PROFILER_ENABLED,default=false"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
