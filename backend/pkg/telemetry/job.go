package telemetry

import (
	"context"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

const (
	JobName = "telemetry_cron"
	// DefaultSchedule mirrors the Python CronTrigger(day_of_week="*"): daily at midnight.
	DefaultSchedule = "0 0 * * *"
	// DefaultEndpoint is the Python hardcoded URL.
	DefaultEndpoint = "https://api.openreplay.com/os/telemetry"
	runTimeout      = 5 * time.Minute
	sendTimeout     = 30 * time.Second
)

// Job is the scheduler.Job replacing crons/core_dynamic_crons.telemetry_cron.
type Job struct {
	log    logger.Logger
	store  Storage
	sender Sender
}

func NewJob(log logger.Logger, pg pool.Pool, endpoint string) *Job {
	if endpoint == "" {
		endpoint = DefaultEndpoint
	}
	return &Job{log: log, store: NewStorage(pg), sender: NewSender(endpoint, sendTimeout)}
}

func (j *Job) Name() string              { return JobName }
func (j *Job) DefaultSchedule() string   { return DefaultSchedule }
func (j *Job) RunTimeout() time.Duration { return runTimeout }

// Run refreshes the counters and reports them. The counters are stamped even when the
// report fails, exactly like the Python version, which updated first and posted second.
func (j *Job) Run(ctx context.Context) error {
	tenants, err := j.store.Compute(ctx)
	if err != nil {
		return err
	}
	if len(tenants) == 0 {
		j.log.Info(ctx, "telemetry: no tenant row, nothing to report")
		return nil
	}
	stats := make([]Stat, 0, len(tenants))
	for _, t := range tenants {
		stats = append(stats, toStat(t))
	}
	if err := j.sender.Send(ctx, stats); err != nil {
		return err
	}
	j.log.Info(ctx, "telemetry: reported %d tenant(s)", len(stats))
	return nil
}
