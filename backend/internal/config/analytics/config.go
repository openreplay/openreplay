package analytics

import (
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
)

type SessionVideosConfig struct {
	AWSRegion       string `env:"AWS_REGION,default=us-east-1"`
	VideoWidth      int    `env:"SESSION_VIDEO_WIDTH,default=1280"`
	VideoHeight     int    `env:"SESSION_VIDEO_HEIGHT,default=720"`
	VideoFPS        int    `env:"SESSION_VIDEO_FPS,default=30"`
	VideoSpeed      int    `env:"SESSION_VIDEO_SPEED,default=1"`
	VideoMode       string `env:"SESSION_VIDEO_MODE,default=video"`
	VideoOutputDir  string `env:"SESSION_VIDEO_OUTPUT_DIR,default=videos"`
	VideoBaseURL    string `env:"SESSION_VIDEO_BASE_URL,default=https://app.openreplay.com"`
	KafkaServers    string `env:"KAFKA_SERVERS"`
	VideoKafkaTopic string `env:"SESSION_VIDEO_KAFKA_TOPIC,default=session-videos"`
}

type Config struct {
	common.Config
	common.Postgres
	common.Clickhouse
	redis.Redis
	common.HTTP
	common.RateLimiter
	FSDir             string        `env:"FS_DIR,required"`
	ProjectExpiration time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	WorkerID          uint16
	SessionVideosConfig
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	cfg.WorkerID = env.WorkerID()
	return cfg
}
