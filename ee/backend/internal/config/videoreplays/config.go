package videoreplays

import (
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.Postgres
	common.HTTP
	common.RateLimiter
	objectstorage.ObjectsConfig
	TopicSessionVideoReplay string        `env:"TOPIC_VIDEO_REPLAY,default=video-replays"`
	GroupSessionVideoReplay string        `env:"GROUP_VIDEO_REPLAY,default=video-consumer"`
	AWSRegion               string        `env:"AWS_REGION,default=eu-central-1"`
	VideoWidth              int           `env:"SESSION_VIDEO_WIDTH,default=1280"`
	VideoHeight             int           `env:"SESSION_VIDEO_HEIGHT,default=720"`
	VideoFPS                int           `env:"SESSION_VIDEO_FPS,default=30"`
	VideoSpeed              int           `env:"SESSION_VIDEO_SPEED,default=1"`
	VideoMode               string        `env:"SESSION_VIDEO_MODE,default=video"`
	VideoOutputDir          string        `env:"SESSION_VIDEO_OUTPUT_DIR,default=videos"`
	VideoBaseURL            string        `env:"SESSION_VIDEO_BASE_URL,default=https://app.openreplay.com"`
	BatchJobQueue           string        `env:"BATCH_JOB_QUEUE,default=replays"`
	BatchJobDefinition      string        `env:"BATCH_JOB_DEFINITION,default=replay_exporter:4"`
	BatchJobBaseName        string        `env:"BATCH_JOB_BASE_NAME,default=replay_exporter"`
	BatchRetryAttempts      int           `env:"BATCH_RETRY_ATTEMPTS,default=3"`
	ProjectExpiration       time.Duration `env:"PROJECT_EXPIRATION,default=10m"`
	WorkerID                uint16
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	cfg.WorkerID = env.WorkerID()
	return cfg
}
