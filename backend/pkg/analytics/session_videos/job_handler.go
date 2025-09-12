package session_videos

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type DatabaseJobHandler struct {
	log    logger.Logger
	pgconn pool.Pool
}

func NewDatabaseJobHandler(log logger.Logger, pgconn pool.Pool) *DatabaseJobHandler {
	return &DatabaseJobHandler{
		log:    log,
		pgconn: pgconn,
	}
}

func (h *DatabaseJobHandler) HandleJobCompletion(sessionID string, message *SessionVideoJobMessage) error {
	ctx := context.Background()

	h.log.Info(ctx, "Processing session video job completion",
		"sessionID", sessionID,
		"status", message.Status,
		"s3Path", message.Name,
		"error", message.Error)

	switch message.Status {
	case StatusCompleted:
		return h.handleSuccessfulJob(ctx, sessionID, message)
	case StatusFailed:
		return h.handleFailedJob(ctx, sessionID, message)
	default:
		h.log.Warn(ctx, "Unknown job status", "sessionID", sessionID, "status", message.Status)
		return fmt.Errorf("unknown job status: %s", message.Status)
	}
}

func (h *DatabaseJobHandler) handleSuccessfulJob(ctx context.Context, sessionID string, message *SessionVideoJobMessage) error {
	h.log.Info(ctx, "Handling successful session video job",
		"sessionID", sessionID,
		"s3Path", message.Name)

	updateQuery := `
		UPDATE public.sessions_videos
		SET status = $2,
			file_url = $3,
			modified_at = $4,
			error_message = NULL
		WHERE session_id = $1`

	err := h.pgconn.Exec(updateQuery, sessionID, StatusCompleted, message.Name, time.Now().Unix())
	if err != nil {
		h.log.Error(ctx, "Failed to update session video record", "error", err, "sessionID", sessionID)
		return fmt.Errorf("unable to update session video status")
	}

	h.log.Info(ctx, "Successfully updated session video record", "sessionID", sessionID)
	return nil
}

func (h *DatabaseJobHandler) handleFailedJob(ctx context.Context, sessionID string, message *SessionVideoJobMessage) error {
	h.log.Error(ctx, "Handling failed session video job",
		"sessionID", sessionID,
		"error", message.Error)

	updateQuery := `
		UPDATE public.sessions_videos
		SET status = $2,
			error_message = $3,
			modified_at = $4,
			file_url = NULL
		WHERE session_id = $1`

	err := h.pgconn.Exec(updateQuery, sessionID, StatusFailed, message.Error, time.Now().Unix())
	if err != nil {
		h.log.Error(ctx, "Failed to update session video record with failure", "error", err, "sessionID", sessionID)
		return fmt.Errorf("unable to update session video status")
	}

	h.log.Info(ctx, "Successfully updated session video record with failure status", "sessionID", sessionID)
	return nil
}

func (h *DatabaseJobHandler) CreateSessionVideoRecord(ctx context.Context, sessionID string, projectID int, userID uint64, jobID string) error {

	insertQuery := `
		INSERT INTO public.sessions_videos (session_id, project_id, user_id, status, job_id, created_at, modified_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		ON CONFLICT (session_id) DO UPDATE SET
			status = $4,
			job_id = $5,
			modified_at = $6`

	now := time.Now().Unix()
	err := h.pgconn.Exec(insertQuery, sessionID, projectID, userID, StatusPending, jobID, now)
	if err != nil {
		h.log.Error(ctx, "Failed to create session video record", "error", err,
			"sessionID", sessionID, "projectID", projectID, "userID", userID, "jobID", jobID)
		return fmt.Errorf("unable to create session video record")
	}

	h.log.Info(ctx, "Successfully created session video record",
		"sessionID", sessionID, "projectID", projectID, "userID", userID, "jobID", jobID)

	return nil
}

func (h *DatabaseJobHandler) GetSessionVideoBySessionAndProject(ctx context.Context, sessionID string, projectID int) (*SessionVideo, error) {
	h.log.Debug(ctx, "Checking for existing session video", "sessionID", sessionID, "projectID", projectID)

	query := `
		SELECT session_id, project_id, user_id, file_url, status, job_id, error_message, created_at, modified_at
		FROM public.sessions_videos
		WHERE session_id = $1 AND project_id = $2`

	var video SessionVideo
	var fileURL sql.NullString
	var jobID sql.NullString
	var errorMessage sql.NullString

	err := h.pgconn.QueryRow(query, sessionID, projectID).Scan(
		&video.SessionID,
		&video.ProjectID,
		&video.UserID,
		&fileURL,
		&video.Status,
		&jobID,
		&errorMessage,
		&video.CreatedAt,
		&video.ModifiedAt,
	)

	if err != nil {
		// Handle any "no rows found" type errors by returning nil (no existing record)
		if err == sql.ErrNoRows ||
			err.Error() == "no rows in result set" ||
			err.Error() == "sql: no rows in result set" {
			h.log.Debug(ctx, "No existing session video found, proceeding with new job", "sessionID", sessionID, "projectID", projectID)
			return nil, nil
		}
		// Log actual database errors but don't fail - continue with new job creation
		h.log.Warn(ctx, "Database query issue while checking session video, proceeding with new job", "error", err, "sessionID", sessionID, "projectID", projectID)
		return nil, nil
	}

	h.log.Debug(ctx, "Found existing session video", "sessionID", sessionID, "projectID", projectID, "status", video.Status)

	if fileURL.Valid {
		video.FileURL = fileURL.String
	}
	if jobID.Valid {
		video.JobID = jobID.String
	}
	if errorMessage.Valid {
		video.ErrorMessage = errorMessage.String
	}

	return &video, nil
}

func (h *DatabaseJobHandler) GetAllSessionVideos(ctx context.Context, projectID int, userID uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error) {
	page := req.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	whereClause := "WHERE project_id = $1"
	args := []interface{}{projectID}
	argIndex := 2

	if req.IsSelf {
		whereClause += fmt.Sprintf(" AND user_id = $%d", argIndex)
		args = append(args, userID)
		argIndex++
	}

	// Add status filter - default to "completed" if not specified
	status := req.Status
	if status == "" {
		status = StatusCompleted
	}

	whereClause += fmt.Sprintf(" AND status = $%d", argIndex)
	args = append(args, status)
	argIndex++

	// Build ORDER BY clause
	orderBy := "ORDER BY created_at DESC"
	if req.SortBy == "datetime" {
		if req.Asc {
			orderBy = "ORDER BY created_at ASC"
		} else {
			orderBy = "ORDER BY created_at DESC"
		}
	}

	query := fmt.Sprintf(`
		SELECT session_id, project_id, user_id, file_url, status, job_id, error_message, created_at, modified_at,
		       COUNT(*) OVER() as total_count
		FROM public.sessions_videos
		%s
		%s
		LIMIT $%d OFFSET $%d`, whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := h.pgconn.Query(query, args...)
	if err != nil {
		h.log.Error(ctx, "Failed to query session videos", "error", err)
		return nil, fmt.Errorf("unable to retrieve session videos")
	}
	defer rows.Close()

	var videos []SessionVideo
	var total int

	for rows.Next() {
		var video SessionVideo
		var fileURL sql.NullString
		var jobID sql.NullString
		var errorMessage sql.NullString

		err := rows.Scan(
			&video.SessionID,
			&video.ProjectID,
			&video.UserID,
			&fileURL,
			&video.Status,
			&jobID,
			&errorMessage,
			&video.CreatedAt,
			&video.ModifiedAt,
			&total,
		)
		if err != nil {
			h.log.Error(ctx, "Failed to scan session video row", "error", err)
			return nil, fmt.Errorf("unable to process session videos")
		}

		if fileURL.Valid {
			video.FileURL = fileURL.String
		}
		if jobID.Valid {
			video.JobID = jobID.String
		}
		if errorMessage.Valid {
			video.ErrorMessage = errorMessage.String
		}

		videos = append(videos, video)
	}

	if err = rows.Err(); err != nil {
		h.log.Error(ctx, "Error iterating session video rows", "error", err)
		return nil, fmt.Errorf("unable to process session videos")
	}

	h.log.Debug(ctx, "Successfully retrieved session videos", "count", len(videos), "total", total)

	return &GetSessionVideosResponse{
		Videos: videos,
		Total:  total,
	}, nil
}

func (h *DatabaseJobHandler) DeleteSessionVideo(ctx context.Context, projectID int, userID uint64, sessionID string) error {
	h.log.Debug(ctx, "Deleting session video", "sessionID", sessionID, "projectID", projectID, "userID", userID)

	deleteQuery := `
		DELETE FROM public.sessions_videos
		WHERE session_id = $1 AND project_id = $2 AND user_id = $3
		RETURNING session_id`

	var deletedSessionID string
	err := h.pgconn.QueryRow(deleteQuery, sessionID, projectID, userID).Scan(&deletedSessionID)
	if err != nil {
		if err == sql.ErrNoRows {
			h.log.Warn(ctx, "Session video not found for deletion", "sessionID", sessionID, "projectID", projectID, "userID", userID)
			return fmt.Errorf("session video not found or you don't have permission to delete it")
		}
		h.log.Error(ctx, "Failed to delete session video", "error", err, "sessionID", sessionID, "projectID", projectID, "userID", userID)
		return fmt.Errorf("unable to delete session video at this time")
	}

	h.log.Info(ctx, "Successfully deleted session video", "sessionID", deletedSessionID, "projectID", projectID, "userID", userID)
	return nil
}
