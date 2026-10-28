package jobs

import (
	"context"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

type Jobs interface {
	HasActiveJob(projectID uint32, userID string) (bool, error)
	Create(projectID uint32, userID string) (*Job, error)
	Get(jobID int, projectID uint32) (*Job, error)
	GetAll(projectID uint32, limit int, page int) ([]*Job, error)
	Cancel(jobID int, projectID uint32) (*Job, error)
	// ExecuteScheduledJobs runs every due job once; it is driven by the run_scheduled_jobs
	// cron of the tasks service (see cron.go).
	ExecuteScheduledJobs(ctx context.Context) error
}

type jobsImpl struct {
	log logger.Logger
	db  pool.Pool
	// objStore, when set, is used to tag the deleted sessions' replay files for removal
	// (the Python sessions_mobs/sessions_devtool.delete_mobs step). Nil in the API, which
	// only creates and cancels jobs.
	objStore    objectstorage.ObjectStorage
	deleteInDay string
}

type Option func(*jobsImpl)

// WithMobDeletion enables tagging replay files of deleted sessions with
// to_delete_in_days=<days>, picked up by the bucket lifecycle rule.
func WithMobDeletion(store objectstorage.ObjectStorage, days string) Option {
	return func(j *jobsImpl) {
		j.objStore = store
		j.deleteInDay = days
	}
}

func New(log logger.Logger, db pool.Pool, opts ...Option) Jobs {
	j := &jobsImpl{log: log, db: db}
	for _, o := range opts {
		o(j)
	}
	return j
}
