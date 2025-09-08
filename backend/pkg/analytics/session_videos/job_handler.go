package session_videos

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

// DatabaseJobHandler handles session video job completion with database integration
type DatabaseJobHandler struct {
	log    logger.Logger
	pgconn pool.Pool
}

// NewDatabaseJobHandler creates a new database-integrated job handler
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
		"error", message.Error,
		"screenshots", message.Screenshots)

	switch message.Status {
	case "completed":
		return h.handleSuccessfulJob(ctx, sessionID, message)
	case "failed":
		return h.handleFailedJob(ctx, sessionID, message)
	default:
		h.log.Warn(ctx, "Unknown job status", "sessionID", sessionID, "status", message.Status)
		return fmt.Errorf("unknown job status: %s", message.Status)
	}
}

func (h *DatabaseJobHandler) handleSuccessfulJob(ctx context.Context, sessionID string, message *SessionVideoJobMessage) error {
	h.log.Info(ctx, "Handling successful session video job",
		"sessionID", sessionID,
		"s3Path", message.Name,
		"screenshots", message.Screenshots)

	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM session_videos WHERE session_id = $1)`
	err := h.pgconn.QueryRow(checkQuery, sessionID).Scan(&exists)
	if err != nil {
		h.log.Error(ctx, "Failed to check if session video record exists", "error", err, "sessionID", sessionID)
		return fmt.Errorf("failed to check session video record: %w", err)
	}

	if exists {
		updateQuery := `
			UPDATE session_videos
			SET status = 'completed',
				file_url = $2,
				screenshots = $3,
				modified_at = $4,
				error_message = NULL
			WHERE session_id = $1`

		err = h.pgconn.Exec(updateQuery, sessionID, message.Name, message.Screenshots, time.Now().Unix())
		if err != nil {
			h.log.Error(ctx, "Failed to update session video record", "error", err, "sessionID", sessionID)
			return fmt.Errorf("failed to update session video record: %w", err)
		}

		h.log.Info(ctx, "Successfully updated session video record", "sessionID", sessionID)
	} else {
		insertQuery := `
			INSERT INTO session_videos (session_id, status, file_url, screenshots, created_at, modified_at)
			VALUES ($1, 'completed', $2, $3, $4, $4)`

		now := time.Now().Unix()
		err = h.pgconn.Exec(insertQuery, sessionID, message.Name, message.Screenshots, now)
		if err != nil {
			h.log.Error(ctx, "Failed to insert session video record", "error", err, "sessionID", sessionID)
			return fmt.Errorf("failed to insert session video record: %w", err)
		}

		h.log.Info(ctx, "Successfully created session video record", "sessionID", sessionID)
	}

	return nil
}

func (h *DatabaseJobHandler) handleFailedJob(ctx context.Context, sessionID string, message *SessionVideoJobMessage) error {
	h.log.Error(ctx, "Handling failed session video job",
		"sessionID", sessionID,
		"error", message.Error)

	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM session_videos WHERE session_id = $1)`
	err := h.pgconn.QueryRow(checkQuery, sessionID).Scan(&exists)
	if err != nil {
		h.log.Error(ctx, "Failed to check if session video record exists", "error", err, "sessionID", sessionID)
		return fmt.Errorf("failed to check session video record: %w", err)
	}

	if exists {
		updateQuery := `
			UPDATE session_videos
			SET status = 'failed',
				error_message = $2,
				modified_at = $3,
				file_url = NULL
			WHERE session_id = $1`

		err = h.pgconn.Exec(updateQuery, sessionID, message.Error, time.Now().Unix())
		if err != nil {
			h.log.Error(ctx, "Failed to update session video record with failure", "error", err, "sessionID", sessionID)
			return fmt.Errorf("failed to update session video record: %w", err)
		}

		h.log.Info(ctx, "Successfully updated session video record with failure status", "sessionID", sessionID)
	} else {
		insertQuery := `
			INSERT INTO session_videos (session_id, status, error_message, created_at, modified_at)
			VALUES ($1, 'failed', $2, $3, $3)`

		now := time.Now().Unix()
		err = h.pgconn.Exec(insertQuery, sessionID, message.Error, now)
		if err != nil {
			h.log.Error(ctx, "Failed to insert failed session video record", "error", err, "sessionID", sessionID)
			return fmt.Errorf("failed to insert session video record: %w", err)
		}

		h.log.Info(ctx, "Successfully created failed session video record", "sessionID", sessionID)
	}

	return nil
}

func (h *DatabaseJobHandler) GetSessionVideoByID(ctx context.Context, sessionID string) (*SessionVideo, error) {

	query := `
		SELECT video_id, session_id, project_id, user_id, file_url, status, created_at, modified_at
		FROM session_videos
		WHERE session_id = $1`

	var video SessionVideo
	var fileURL sql.NullString

	err := h.pgconn.QueryRow(query, sessionID).Scan(
		&video.VideoID,
		&video.SessionID,
		&video.ProjectID,
		&video.UserID,
		&fileURL,
		&video.Status,
		&video.CreatedAt,
		&video.ModifiedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		h.log.Error(ctx, "Failed to get session video by ID", "error", err, "sessionID", sessionID)
		return nil, fmt.Errorf("failed to get session video: %w", err)
	}

	if fileURL.Valid {
		video.FileURL = fileURL.String
	}

	return &video, nil
}

func (h *DatabaseJobHandler) CreateSessionVideoRecord(ctx context.Context, sessionID string, projectID int, userID uint64, jobID string) error {

	videoID := fmt.Sprintf("vid_%s_%d", sessionID, time.Now().Unix())

	insertQuery := `
		INSERT INTO session_videos (video_id, session_id, project_id, user_id, status, job_id, created_at, modified_at)
		VALUES ($1, $2, $3, $4, 'pending', $5, $6, $6)
		ON CONFLICT (session_id) DO UPDATE SET
			status = 'pending',
			job_id = $5,
			modified_at = $6`

	now := time.Now().Unix()
	err := h.pgconn.Exec(insertQuery, videoID, sessionID, projectID, userID, jobID, now)
	if err != nil {
		h.log.Error(ctx, "Failed to create session video record", "error", err,
			"sessionID", sessionID, "projectID", projectID, "userID", userID, "jobID", jobID)
		return fmt.Errorf("failed to create session video record: %w", err)
	}

	h.log.Info(ctx, "Successfully created session video record",
		"videoID", videoID, "sessionID", sessionID, "projectID", projectID, "userID", userID, "jobID", jobID)

	return nil
}
