package connector

import (
	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/internal/config/redis"
	"openreplay/backend/pkg/logger"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	common.Config
	common.Postgres
	redis.Redis
	common.Redshift
	common.Clickhouse
	common.ElasticSearch
	objectstorage.ObjectsConfig
	ConnectorType      string        `env:"CONNECTOR_TYPE,default=redshift"`
	SessionsTableName  string        `env:"SESSIONS_TABLE_NAME,default=connector_user_sessions"`
	EventsTableName    string        `env:"EVENTS_TABLE_NAME,default=connector_events"`
	EventLevel         string        `env:"EVENT_LEVEL,default=normal"`
	GroupConnector     string        `env:"GROUP_CONNECTOR,default=connector"`
	TopicRawWeb        string        `env:"TOPIC_RAW_WEB,required"`
	TopicAnalytics     string        `env:"TOPIC_ANALYTICS,required"`
	CommitBatchTimeout time.Duration `env:"COMMIT_BATCH_TIMEOUT,default=5s"`
	UseProfiler        bool          `env:"PROFILER_ENABLED,default=false"`
	ProjectIDs         string        `env:"PROJECT_IDS"`
	UseS3Batches       bool          `env:"CLICKHOUSE_USE_S3_BATCHES,default=true"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}

func (c *Config) GetAllowedProjectIDs() []int {
	stringIDs := strings.Split(c.ProjectIDs, ",")
	if len(stringIDs) == 0 {
		return nil
	}
	ids := make([]int, 0, len(stringIDs))
	for _, id := range stringIDs {
		intID, err := strconv.Atoi(id)
		if err != nil {
			continue
		}
		ids = append(ids, intID)
	}
	if len(ids) == 0 {
		return nil
	}
	return ids
}
