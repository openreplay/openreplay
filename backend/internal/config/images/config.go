package images

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.HTTP
	redis.Redis
	common.Postgres
	objectstorage.ObjectsConfig
	TokenSecret       string `env:"TOKEN_SECRET,required"`
	FSDir             string `env:"FS_DIR,required"`
	ScreenshotsDir    string `env:"SCREENSHOTS_DIR,default=screenshots"`
	TopicRawImages    string `env:"TOPIC_RAW_IMAGES,required"`
	GroupImageStorage string `env:"GROUP_IMAGE_STORAGE,required"`
	UseProfiler       bool   `env:"PROFILER_ENABLED,default=false"`
	UnpackedSizeLimit int64  `env:"UNPACKED_SIZE_LIMIT,default=50000000"` // 50mb
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
