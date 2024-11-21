package http

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
	"time"
)

type Config struct {
	common.Config
	common.Postgres
	redis.Redis
	objectstorage.ObjectsConfig
	common.HTTP
	TopicRawWeb            string        `env:"TOPIC_RAW_WEB,required"`
	TopicRawMobile         string        `env:"TOPIC_RAW_IOS,required"`
	TopicRawImages         string        `env:"TOPIC_RAW_IMAGES,required"`
	TopicCanvasImages      string        `env:"TOPIC_CANVAS_IMAGES,required"`
	BeaconSizeLimit        int64         `env:"BEACON_SIZE_LIMIT,required"`
	CompressionThreshold   int64         `env:"COMPRESSION_THRESHOLD,default=20000"`
	FileSizeLimit          int64         `env:"FILE_SIZE_LIMIT,default=10000000"`
	TokenSecret            string        `env:"TOKEN_SECRET,required"`
	UAParserFile           string        `env:"UAPARSER_FILE,required"`
	MaxMinDBFile           string        `env:"MAXMINDDB_FILE,required"`
	UseProfiler            bool          `env:"PROFILER_ENABLED,default=false"`
	ProjectExpiration      time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	RecordCanvas           bool          `env:"RECORD_CANVAS,default=false"`
	CanvasQuality          string        `env:"CANVAS_QUALITY,default=low"`
	CanvasFps              int           `env:"CANVAS_FPS,default=1"`
	MobileQuality          string        `env:"MOBILE_QUALITY,default=low"` // (low, standard, high)
	MobileFps              int           `env:"MOBILE_FPS,default=1"`
	IsFeatureFlagEnabled   bool          `env:"IS_FEATURE_FLAG_ENABLED,default=false"`
	IsUsabilityTestEnabled bool          `env:"IS_USABILITY_TEST_ENABLED,default=false"`
	WorkerID               uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
