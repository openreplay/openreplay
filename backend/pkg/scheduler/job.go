package scheduler

import (
	"context"
	"time"
)

// Job is a unit of scheduled work. Name must be unique, lowercase and match [a-z0-9_]+.
type Job interface {
	Name() string
	// DefaultSchedule is a standard 5-field cron expression (or @every/@hourly/...),
	// used when CRON_SCHEDULES does not override it.
	DefaultSchedule() string
	// Run must honor ctx cancellation (per-run timeout and shutdown).
	Run(ctx context.Context) error
}

// TimeoutJob is optional; a Job implementing it overrides the scheduler's default per-run timeout.
type TimeoutJob interface {
	RunTimeout() time.Duration
}
