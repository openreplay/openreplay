package connector

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/internal/config/redis"
	"time"
)

type Config struct {
	common.Config
	common.Postgres
	redis.Redis
	common.Redshift
	objectstorage.ObjectsConfig
	SessionsTableName  string        `env:"SESSIONS_TABLE_NAME,default=connector_user_sessions"`
	EventsTableName    string        `env:"EVENTS_TABLE_NAME,default=connector_events"`
	EventLevel         string        `env:"EVENT_LEVEL,default=normal"`
	GroupConnector     string        `env:"GROUP_REDSHIFT_CONNECTOR,default=redshift-connector"`
	TopicRawWeb        string        `env:"TOPIC_RAW_WEB,required"`
	TopicAnalytics     string        `env:"TOPIC_ANALYTICS,required"`
	CommitBatchTimeout time.Duration `env:"COMMIT_BATCH_TIMEOUT,default=5s"`
	UseProfiler        bool          `env:"PROFILER_ENABLED,default=false"`
}

func New() *Config {
	cfg := &Config{}
	configurator.Process(cfg)
	return cfg
}
