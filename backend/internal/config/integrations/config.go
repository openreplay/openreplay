package integrations

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
)

type Config struct {
	common.Config
	TopicAnalytics             string `env:"TOPIC_ANALYTICS,required"`
	Postgres                   string `env:"POSTGRES_STRING,required"`
	BatchQueueLimit            int    `env:"DB_BATCH_QUEUE_LIMIT,required"`
	BatchSizeLimit             int    `env:"DB_BATCH_SIZE_LIMIT,required"`
	ProjectExpirationTimeoutMs int64  `env:"PROJECT_EXPIRATION_TIMEOUT_MS,default=1200000"`
	TokenSecret                string `env:"TOKEN_SECRET,required"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
