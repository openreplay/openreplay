package storage

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/logger"
	"time"
)

type Config struct {
	common.Config
	objectstorage.ObjectsConfig
	FSDir                string        `env:"FS_DIR,required"`
	RetryTimeout         time.Duration `env:"RETRY_TIMEOUT,default=2m"`
	GroupStorage         string        `env:"GROUP_STORAGE,required"`
	TopicTrigger         string        `env:"TOPIC_TRIGGER,required"`
	GroupFailover        string        `env:"GROUP_STORAGE_FAILOVER"`
	TopicFailover        string        `env:"TOPIC_STORAGE_FAILOVER"`
	DeleteTimeout        time.Duration `env:"DELETE_TIMEOUT,default=48h"`
	ProducerCloseTimeout int           `env:"PRODUCER_CLOSE_TIMEOUT,default=15000"`
	UseFailover          bool          `env:"USE_FAILOVER,default=false"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
