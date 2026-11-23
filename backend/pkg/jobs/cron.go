package jobs

import (
	"context"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

const (
	CronName = "run_scheduled_jobs"
	// CronSchedule mirrors the Python CronTrigger(day_of_week="*", hour=0, minute=15).
	CronSchedule = "15 0 * * *"
	cronTimeout  = 30 * time.Minute
)

// CronJob is the scheduler.Job replacing crons/core_dynamic_crons.run_scheduled_jobs.
type CronJob struct {
	jobs Jobs
}

func NewCronJob(log logger.Logger, pg pool.Pool, objStore objectstorage.ObjectStorage, deleteInDays string) *CronJob {
	return &CronJob{jobs: New(log, pg, WithMobDeletion(objStore, deleteInDays))}
}

func (c *CronJob) Name() string                  { return CronName }
func (c *CronJob) DefaultSchedule() string       { return CronSchedule }
func (c *CronJob) RunTimeout() time.Duration     { return cronTimeout }
func (c *CronJob) Run(ctx context.Context) error { return c.jobs.ExecuteScheduledJobs(ctx) }
