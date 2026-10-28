package tasks

import (
	"time"

	"openreplay/backend/internal/config/common"
	"openreplay/backend/internal/config/configurator"
	"openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/logger"
)

type Config struct {
	common.Config
	common.Postgres
	common.Clickhouse
	common.SMTP
	objectstorage.ObjectsConfig
	// CronSchedules overrides a cron's default schedule. Comma-separated "<name> <cron expr>"
	// pairs, e.g. "alerts * * * * *, other 0 5 * * 1". Unknown names are warned and ignored;
	// invalid expressions are fatal. Because "," separates entries, list syntax inside an
	// expression ("1,3") is not supported: use ranges or steps. Evaluated in the process
	// time zone (UTC in the Docker image).
	CronSchedules string `env:"CRON_SCHEDULES,default="`
	// CronDisabled is a comma-separated list of cron names to disable, e.g. "alerts,other".
	CronDisabled string `env:"CRON_DISABLED,default="`

	// Alerts cron settings.
	SiteURL                   string        `env:"SITE_URL,required"`
	AlertsWebhookAllowedHosts string        `env:"ALERTS_WEBHOOK_ALLOWED_HOSTS,default="`
	AlertsCHTimeout           time.Duration `env:"ALERTS_CH_TIMEOUT,default=30s"`
	AlertsRunTimeout          time.Duration `env:"ALERTS_RUN_TIMEOUT,default=55s"`
	MetadataCacheTTL          int           `env:"METADATA_CACHE_TTL,default=300"`

	// Telemetry cron settings.
	TelemetryURL string `env:"TELEMETRY_URL,default=https://api.openreplay.com/os/telemetry"`

	// Scheduled-jobs cron settings: value of the to_delete_in_days tag put on the replay
	// files of deleted sessions (matches the Python SCH_DELETE_DAYS).
	SchDeleteDays string `env:"SCH_DELETE_DAYS,default=7"`
}

func New(log logger.Logger) *Config {
	cfg := &Config{}
	configurator.Process(log, cfg)
	return cfg
}
