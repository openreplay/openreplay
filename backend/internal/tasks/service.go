package tasks

import (
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	config "openreplay/backend/internal/config/tasks"
	"openreplay/backend/pkg/alerts"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	schedulerMetrics "openreplay/backend/pkg/metrics/scheduler"
	"openreplay/backend/pkg/scheduler"
)

// New builds the scheduler, registers every cron in its documented order and starts it.
// Overrides are parsed by the caller (see cmd/tasks) so that a bad
// CRON_SCHEDULES fails before any database connection is opened.
// To add a cron, implement scheduler.Job and add one Register call below.
func New(log logger.Logger, cfg *config.Config, overrides scheduler.Overrides, pg pool.Pool, ch driver.Conn, metrics schedulerMetrics.Scheduler) (*scheduler.Scheduler, error) {
	s := scheduler.New(log, metrics, scheduler.WithOverrides(overrides))

	// 1. alerts
	alertsJob, err := alerts.NewJob(log, alerts.Config{
		SiteURL:             cfg.SiteURL,
		SMTP:                cfg.SMTP,
		WebhookAllowedHosts: cfg.AlertsWebhookAllowedHosts,
		CHTimeout:           cfg.AlertsCHTimeout,
		RunTimeout:          cfg.AlertsRunTimeout,
		MetadataCacheTTL:    time.Duration(cfg.MetadataCacheTTL) * time.Second,
	}, pg, ch)
	if err != nil {
		return nil, err
	}
	if err := s.Register(alertsJob); err != nil {
		return nil, err
	}

	if err := s.Start(); err != nil {
		return nil, err
	}
	return s, nil
}
