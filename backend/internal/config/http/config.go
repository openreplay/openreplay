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
	TokenSecret          string        `env:"TOKEN_SECRET,required"`
	TopicRawWeb          string        `env:"TOPIC_RAW_WEB,required"`
	TopicRawMobile       string        `env:"TOPIC_RAW_IOS,required"`
	TopicRawImages       string        `env:"TOPIC_RAW_IMAGES,required"`
	TopicRawAssets       string        `env:"TOPIC_RAW_ASSETS,required"`
	TopicRawAnalytics    string        `env:"TOPIC_RAW_ANALYTICS,required"`
	BeaconSizeLimit      int64         `env:"BEACON_SIZE_LIMIT,required"`
	CompressionThreshold int64         `env:"COMPRESSION_THRESHOLD,default=20000"`
	UAParserFile         string        `env:"UAPARSER_FILE,required"`
	MaxMinDBFile         string        `env:"MAXMINDDB_FILE,required"`
	UseProfiler          bool          `env:"PROFILER_ENABLED,default=false"`
	ProjectExpiration    time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	RecordCanvas         bool          `env:"RECORD_CANVAS,default=false"`
	CanvasQuality        string        `env:"CANVAS_QUALITY,default=low"`
	CanvasFps            int           `env:"CANVAS_FPS,default=1"`
	MobileQuality        string        `env:"MOBILE_QUALITY,default=low"` // (low, standard, high)
	MobileFps            int           `env:"MOBILE_FPS,default=1"`
	ProtocolVersion      int           `env:"PROTOCOL_VERSION,default=2"`
	OTLPCollectorURL     string        `env:"OTLP_COLLECTOR_URL,default=http://localhost:4318"`
	OTLPBodyLimit        int64         `env:"OTLP_BODY_LIMIT,default=4194304"`
	OTLPRetentionDays    int           `env:"OTLP_RETENTION_DAYS,default=30"`
	OTLPRateLimitBytes   int64         `env:"OTLP_RATE_LIMIT_BYTES,default=5242880"`
	OTLPRateLimitBurst   int64         `env:"OTLP_RATE_LIMIT_BURST,default=20971520"`
	OTLPAuthFailPerMin   int           `env:"OTLP_AUTH_FAIL_PER_MIN,default=0"`
	OTLPAuthFailBurst    int           `env:"OTLP_AUTH_FAIL_BURST,default=20"`
	OTLPAuthFailGlobal   int           `env:"OTLP_AUTH_FAIL_GLOBAL_PER_SEC,default=0"`
	WorkerID             uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{WorkerID: env.WorkerID()}
	configurator.Process(log, cfg)
	return cfg
}
