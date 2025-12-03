package canvases

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
	TopicCanvasImages  string `env:"TOPIC_CANVAS_IMAGES,required"`  // For canvas images and sessionEnd events from ender
	TopicCanvasTrigger string `env:"TOPIC_CANVAS_TRIGGER,required"` // For trigger events to start processing (archive and upload)
	GroupCanvasImage   string `env:"GROUP_CANVAS_IMAGE,required"`
	UseProfiler        bool   `env:"PROFILER_ENABLED,default=false"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
