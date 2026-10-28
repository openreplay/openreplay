package tasks

import (
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	config "openreplay/backend/internal/config/tasks"
	"openreplay/backend/pkg/alerts"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/jobs"
	"openreplay/backend/pkg/logger"
	schedulerMetrics "openreplay/backend/pkg/metrics/scheduler"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/scheduler"
	"openreplay/backend/pkg/telemetry"
)

// New builds the scheduler, registers every cron in its documented order and starts it.
// Overrides are parsed by the caller (see cmd/tasks) so that a bad
// CRON_SCHEDULES fails before any database connection is opened.
// To add a cron, implement scheduler.Job and add one Register call below; EE-only crons go
// through eeJobs instead.
func New(log logger.Logger, cfg *config.Config, overrides scheduler.Overrides, pg pool.Pool, ch driver.Conn, objStore objectstorage.ObjectStorage, metrics schedulerMetrics.Scheduler) (*scheduler.Scheduler, error) {
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

	// 2. telemetry (replaces crons/core_dynamic_crons.telemetry_cron)
	if err := s.Register(telemetry.NewJob(log, pg, cfg.TelemetryURL)); err != nil {
		return nil, err
	}

	// 3. scheduled jobs (replaces crons/core_dynamic_crons.run_scheduled_jobs)
	if err := s.Register(jobs.NewCronJob(log, pg, objStore, cfg.SchDeleteDays)); err != nil {
		return nil, err
	}

	// Edition-specific crons (none in the community edition, see ee.go).
	extra, err := eeJobs(eeDeps{log: log, cfg: cfg, pg: pg, ch: ch, objStore: objStore})
	if err != nil {
		return nil, err
	}
	for _, j := range extra {
		if err := s.Register(j); err != nil {
			return nil, err
		}
	}

	if err := s.Start(); err != nil {
		return nil, err
	}
	return s, nil
}
