package jobs

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres"
)

// jobColumns is the column set shared by every query that returns job rows;
// it matches jobRow's db tags one to one.
const jobColumns = `job_id, project_id, description, status, action, reference_id, created_at, updated_at, start_at, errors`

// jobRow mirrors one public.jobs row. Job carries epoch-millis timestamps,
// so rows are converted through toJob.
type jobRow struct {
	JobID       int        `db:"job_id"`
	ProjectID   uint32     `db:"project_id"`
	Description string     `db:"description"`
	Status      string     `db:"status"`
	Action      string     `db:"action"`
	ReferenceID string     `db:"reference_id"`
	CreatedAt   time.Time  `db:"created_at"`
	UpdatedAt   *time.Time `db:"updated_at"`
	StartAt     time.Time  `db:"start_at"`
	Errors      *string    `db:"errors"`
}

func (r jobRow) toJob() *Job {
	return &Job{
		JobID:       r.JobID,
		ProjectID:   r.ProjectID,
		Description: r.Description,
		Status:      r.Status,
		Action:      r.Action,
		ReferenceID: r.ReferenceID,
		CreatedAt:   toMillis(r.CreatedAt),
		UpdatedAt:   toMillisPtr(r.UpdatedAt),
		StartAt:     toMillis(r.StartAt),
		Errors:      r.Errors,
	}
}

// collectJob collects exactly one job row, mapped by column name.
func collectJob(rows pgx.Rows, err error) (*Job, error) {
	if err != nil {
		return nil, err
	}
	row, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[jobRow])
	if err != nil {
		return nil, err
	}
	return row.toJob(), nil
}

// collectJobs collects all job rows, mapped by column name.
func collectJobs(rows pgx.Rows, err error) ([]*Job, error) {
	if err != nil {
		return nil, err
	}
	jobRows, err := pgx.CollectRows(rows, pgx.RowToStructByName[jobRow])
	if err != nil {
		return nil, err
	}
	jobs := make([]*Job, len(jobRows))
	for i, r := range jobRows {
		jobs[i] = r.toJob()
	}
	return jobs, nil
}

func (j *jobsImpl) HasActiveJob(projectID uint32, userID string) (bool, error) {
	var exists bool
	err := j.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM public.jobs
			WHERE project_id = @projectId AND reference_id = @referenceId
				AND status IN ('scheduled', 'running')
		)
	`, pgx.NamedArgs{"projectId": projectID, "referenceId": userID}).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check active jobs: %w", err)
	}
	return exists, nil
}

func (j *jobsImpl) Create(projectID uint32, userID string) (*Job, error) {
	job, err := collectJob(j.db.Query(`
		INSERT INTO public.jobs (project_id, description, status, action, reference_id, start_at)
		VALUES (@projectId, @description, @status, @action, @referenceId, @startAt)
		RETURNING `+jobColumns,
		pgx.NamedArgs{
			"projectId":   projectID,
			"description": fmt.Sprintf("Delete user sessions of userId = %s", userID),
			"status":      StatusScheduled,
			"action":      ActionDeleteUserData,
			"referenceId": userID,
			"startAt":     midnightTomorrowUTC(),
		}))
	if err != nil {
		return nil, fmt.Errorf("failed to create job: %w", err)
	}
	return job, nil
}

func (j *jobsImpl) Get(jobID int, projectID uint32) (*Job, error) {
	job, err := collectJob(j.db.Query(`
		SELECT `+jobColumns+`
		FROM public.jobs
		WHERE job_id = @jobId AND project_id = @projectId
	`, pgx.NamedArgs{"jobId": jobID, "projectId": projectID}))
	if err != nil {
		return nil, fmt.Errorf("job not found: %w", err)
	}
	return job, nil
}

func (j *jobsImpl) GetAll(projectID uint32, limit int, page int) ([]*Job, error) {
	jobs, err := collectJobs(j.db.Query(`
		SELECT `+jobColumns+`
		FROM public.jobs
		WHERE project_id = @projectId
		ORDER BY job_id DESC
		LIMIT @limit OFFSET @offset
	`, pgx.NamedArgs{"projectId": projectID, "limit": limit, "offset": (page - 1) * limit}))
	if err != nil {
		return nil, fmt.Errorf("failed to list jobs: %w", err)
	}
	return jobs, nil
}

func (j *jobsImpl) Cancel(jobID int, projectID uint32) (*Job, error) {
	job, err := collectJob(j.db.Query(`
		UPDATE public.jobs
		SET status = @status, updated_at = timezone('utc'::text, now())
		WHERE job_id = @jobId AND project_id = @projectId
			AND status NOT IN ('completed', 'cancelled')
		RETURNING `+jobColumns,
		pgx.NamedArgs{"status": StatusCancelled, "jobId": jobID, "projectId": projectID}))
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			existing, getErr := j.Get(jobID, projectID)
			if getErr != nil {
				return nil, ErrJobNotFound
			}
			return nil, fmt.Errorf("the requested job has already been %s", existing.Status)
		}
		return nil, fmt.Errorf("failed to cancel job: %w", err)
	}
	return job, nil
}

func (j *jobsImpl) ExecuteScheduledJobs() error {
	jobsToExecute, err := collectJobs(j.db.Query(`
		SELECT `+jobColumns+`
		FROM public.jobs
		WHERE status = @status AND start_at <= (now() AT TIME ZONE 'utc')
	`, pgx.NamedArgs{"status": StatusScheduled}))
	if err != nil {
		return fmt.Errorf("failed to query scheduled jobs: %w", err)
	}

	for _, job := range jobsToExecute {
		j.log.Info(context.Background(), "executing jobId:%d", job.JobID)
		j.executeJob(job)
	}

	return nil
}

func (j *jobsImpl) executeJob(job *Job) {
	ctx := context.Background()

	if job.Action != ActionDeleteUserData {
		errMsg := fmt.Sprintf("unsupported action: %s", job.Action)
		j.log.Error(ctx, "%s", errMsg)
		j.updateJobStatus(job.JobID, StatusFailed, &errMsg)
		return
	}

	if err := j.deleteUserSessionsInBatches(ctx, job.ProjectID, job.ReferenceID, job.JobID); err != nil {
		errMsg := fmt.Sprintf("failed to delete sessions: %v", err)
		j.log.Error(ctx, "%s", errMsg)
		j.updateJobStatus(job.JobID, StatusFailed, &errMsg)
		return
	}

	j.log.Info(ctx, "job completed jobId:%d", job.JobID)
	j.updateJobStatus(job.JobID, StatusCompleted, nil)
}

func (j *jobsImpl) updateJobStatus(jobID int, status string, errMsg *string) {
	if err := j.db.Exec(`
		UPDATE public.jobs
		SET status = @status, errors = @errors, updated_at = timezone('utc'::text, now())
		WHERE job_id = @jobId
	`, pgx.NamedArgs{"status": status, "errors": errMsg, "jobId": jobID}); err != nil {
		j.log.Error(context.Background(), "failed to update job %d status: %v", jobID, err)
	}
}

const deletionBatchSize = 1000

func (j *jobsImpl) deleteUserSessionsInBatches(ctx context.Context, projectID uint32, userID string, jobID int) error {
	for {
		ids, err := j.getSessionIDsByUserID(projectID, userID, deletionBatchSize)
		if err != nil {
			return fmt.Errorf("failed to get sessions: %w", err)
		}
		if len(ids) == 0 {
			return nil
		}
		j.log.Info(ctx, "deleting %d sessions for jobId:%d", len(ids), jobID)
		if err := j.deleteSessionsByIDs(ids); err != nil {
			return fmt.Errorf("failed to delete sessions: %w", err)
		}
		if len(ids) < deletionBatchSize {
			return nil
		}
	}
}

func (j *jobsImpl) getSessionIDsByUserID(projectID uint32, userID string, limit int) ([]int64, error) {
	rows, err := j.db.Query(`
		SELECT session_id
		FROM public.sessions
		WHERE project_id = @projectId AND user_id = @userId
		LIMIT @limit
	`, pgx.NamedArgs{"projectId": projectID, "userId": userID, "limit": limit})
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[int64])
}

func (j *jobsImpl) deleteSessionsByIDs(sessionIDs []int64) error {
	if len(sessionIDs) == 0 {
		return nil
	}
	return j.db.Exec(
		"DELETE FROM public.sessions WHERE session_id = ANY(@sessionIds)",
		pgx.NamedArgs{"sessionIds": sessionIDs},
	)
}
