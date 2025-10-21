package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Storage struct {
	log    logger.Logger
	pgconn pool.Pool
}

func NewStorage(log logger.Logger, pgconn pool.Pool) (*Storage, error) {
	switch {
	case log == nil:
		return nil, errors.New("nil logger")
	case pgconn == nil:
		return nil, errors.New("nil pg connection")
	}
	return &Storage{
		log:    log,
		pgconn: pgconn,
	}, nil
}

func (h *Storage) HandleJobCompletion(sessionID string, message *SessionVideoJobMessage) error {
	ctx := context.Background()

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

func (h *Storage) handleSuccessfulJob(ctx context.Context, sessionID string, message *SessionVideoJobMessage) error {
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

	return nil
}

func (h *Storage) handleFailedJob(ctx context.Context, sessionID string, message *SessionVideoJobMessage) error {
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

	return nil
}

func (h *Storage) CreateSessionVideoRecord(ctx context.Context, sessionID string, projectID int, userID uint64, jobID string) error {
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

	return nil
}

func (h *Storage) GetSessionVideoBySessionAndProject(ctx context.Context, sessionID string, projectID int) (*SessionVideo, error) {
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
		if err == sql.ErrNoRows ||
			err.Error() == "no rows in result set" ||
			err.Error() == "sql: no rows in result set" {
			h.log.Debug(ctx, "No existing session video found, proceeding with new job", "sessionID", sessionID, "projectID", projectID)
			return nil, nil // !!! antipattern
		}

		h.log.Warn(ctx, "Database query issue while checking session video, proceeding with new job", "error", err, "sessionID", sessionID, "projectID", projectID)
		return nil, nil // !!! antipattern
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

	return &video, nil
}

func (h *Storage) GetAllSessionVideos(ctx context.Context, projectID int, userID uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error) {
	page := req.Page
	if page <= 0 {
		page = 1
	}
	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	whereClause := "WHERE sv.project_id = $1"
	args := []interface{}{projectID}
	argIndex := 2

	if req.IsSelf {
		whereClause += fmt.Sprintf(" AND sv.user_id = $%d", argIndex)
		args = append(args, userID)
		argIndex++
	}

	if req.Status != "" {
		whereClause += fmt.Sprintf(" AND sv.status = $%d", argIndex)
		args = append(args, req.Status)
		argIndex++
	}

	orderBy := "ORDER BY sv.created_at DESC"
	if req.SortBy == "datetime" {
		if req.Asc {
			orderBy = "ORDER BY sv.created_at ASC"
		} else {
			orderBy = "ORDER BY sv.created_at DESC"
		}
	}

	query := fmt.Sprintf(`
		SELECT sv.session_id, sv.project_id, sv.user_id, u.name as user_name, sv.file_url, sv.status, sv.job_id, sv.error_message, sv.created_at, sv.modified_at,
		       COUNT(*) OVER() as total_count
		FROM public.sessions_videos sv
		LEFT JOIN public.users u ON sv.user_id = u.user_id
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

	var videos = make([]SessionVideo, 0)
	var total int

	for rows.Next() {
		var video SessionVideo
		var fileURL sql.NullString
		var jobID sql.NullString
		var errorMessage sql.NullString
		var userName sql.NullString

		err := rows.Scan(
			&video.SessionID,
			&video.ProjectID,
			&video.UserID,
			&userName,
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

		if userName.Valid {
			video.UserName = userName.String
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

	return &GetSessionVideosResponse{
		Videos: videos,
		Total:  total,
	}, nil
}

func (h *Storage) DeleteSessionVideo(ctx context.Context, projectID int, userID uint64, sessionID string) error {
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

	return nil
}
