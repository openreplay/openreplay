package session_videos

import (
	"context"
	"database/sql"
	"fmt"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/session_videos/jwt"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
	"openreplay/backend/pkg/server/auth"
)

const (
	ConsumerGroupID = "session-videos-consumer"
)

var (
	ErrSessionNotFound       = fmt.Errorf("session not found")
	ErrServiceUnavailable    = fmt.Errorf("session video service is temporarily unavailable")
	ErrUnableToVerifySession = fmt.Errorf("unable to verify session")
	ErrVideoNotFound         = fmt.Errorf("session video not found")
	ErrVideoNotReady         = fmt.Errorf("session video is not ready for download yet")
	ErrFileNotAvailable      = fmt.Errorf("session video file is not available")
	ErrDownloadUnavailable   = fmt.Errorf("download service is temporarily unavailable")
	ErrUnableToGenerateLink  = fmt.Errorf("unable to generate download link")
	ErrAuthenticationFailed  = fmt.Errorf("authentication failed, please try again")
)

type SessionVideos interface {
	ExportSessionVideo(projectId int, userId uint64, tenantID uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error)
	GetAll(projectId int, userId uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error)
	DeleteSessionVideo(projectId int, userId uint64, sessionId string) (interface{}, error)
	DownloadSessionVideo(projectId int, userId uint64, sessionId string) (string, error)
}

type sessionVideosImpl struct {
	ctx                 context.Context
	log                 logger.Logger
	pgconn              pool.Pool
	cfg                 *config.Config
	sessionBatchService *SessionBatchService
	kafkaConsumer       *SessionVideoConsumer
	jobHandler          *DatabaseJobHandler
	jwtProvider         jwt.ServiceJWTProvider
	auth                auth.Auth
	objStorage          objectstorage.ObjectStorage
}

func New(log logger.Logger, cfg *config.Config, pgconn pool.Pool, auth auth.Auth) SessionVideos {
	impl := &sessionVideosImpl{
		ctx:    context.Background(),
		log:    log,
		pgconn: pgconn,
		cfg:    cfg,
		auth:   auth,
	}

	impl.sessionBatchService = impl.initSessionBatchService(log, cfg)
	impl.kafkaConsumer = impl.initKafkaConsumer(log, cfg, pgconn)
	impl.jobHandler = NewDatabaseJobHandler(log, pgconn)
	impl.jwtProvider = jwt.NewServiceJWTProvider(log, pgconn, cfg)
	impl.objStorage = impl.initObjectStorage(log, cfg)

	return impl
}

func (s *sessionVideosImpl) initSessionBatchService(log logger.Logger, cfg *config.Config) *SessionBatchService {
	service, err := NewSessionBatchService(&cfg.SessionVideosConfig, log)
	if err != nil {
		log.Error(context.Background(), "Failed to create session batch service", "error", err)
		return nil
	}
	return service
}

func (s *sessionVideosImpl) initObjectStorage(log logger.Logger, cfg *config.Config) objectstorage.ObjectStorage {
	objStorage, err := store.NewStore(&cfg.ObjectsConfig)
	if err != nil {
		log.Error(context.Background(), "Failed to create object storage", "error", err)
		return nil
	}
	return objStorage
}

func (s *sessionVideosImpl) initKafkaConsumer(log logger.Logger, cfg *config.Config, pgconn pool.Pool) *SessionVideoConsumer {
	if cfg.SessionVideosConfig.VideoKafkaTopic == "" {
		return nil
	}

	jobHandler := NewDatabaseJobHandler(log, pgconn)
	consumer, err := NewSessionVideoConsumer(
		ConsumerGroupID,
		[]string{cfg.SessionVideosConfig.VideoKafkaTopic},
		jobHandler,
		log,
	)
	if err != nil {
		log.Error(context.Background(), "Failed to create session video consumer", "error", err)
		return nil
	}
	return consumer
}

func (s *sessionVideosImpl) validateSessionAccess(ctx context.Context, sessionId string, projectId int, userId uint64, operation string) error {
	s.log.Debug(ctx, fmt.Sprintf("Verifying session exists in project for %s", operation),
		"sessionID", sessionId, "projectID", projectId, "userID", userId)

	exists, err := s.verifySessionExistsInProject(ctx, sessionId, projectId)
	if err != nil {
		s.log.Error(ctx, fmt.Sprintf("Failed to verify session existence for %s", operation),
			"error", err, "sessionID", sessionId, "projectID", projectId)
		return ErrUnableToVerifySession
	}

	if !exists {
		s.log.Warn(ctx, fmt.Sprintf("Session not found in project for %s", operation),
			"sessionID", sessionId, "projectID", projectId, "userID", userId)
		return ErrSessionNotFound
	}

	return nil
}

func (s *sessionVideosImpl) verifySessionExistsInProject(ctx context.Context, sessionID string, projectID int) (bool, error) {
	query := `
		SELECT 1
		FROM public.sessions
		WHERE session_id = $1 AND project_id = $2
		LIMIT 1`

	var exists int
	err := s.pgconn.QueryRow(query, sessionID, projectID).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (s *sessionVideosImpl) createExportResponse(video *SessionVideo) *SessionVideoExportResponse {
	response := &SessionVideoExportResponse{
		Status: video.Status,
		JobID:  video.JobID,
	}
	if video.FileURL != "" {
		response.FileURL = video.FileURL
	}
	return response
}

func (s *sessionVideosImpl) logExistingVideoInfo(ctx context.Context, video *SessionVideo, sessionID string, projectId int, tenantID uint64) {
	if video == nil {
		s.log.Debug(ctx, "No existing session video found, will create new job",
			"sessionID", sessionID, "projectID", projectId, "tenantID", tenantID)
	} else {
		s.log.Debug(ctx, "Found existing session video",
			"sessionID", sessionID, "projectID", projectId, "tenantID", tenantID,
			"status", video.Status, "jobID", video.JobID)
	}
}

func (s *sessionVideosImpl) logJobSubmission(ctx context.Context, video *SessionVideo, sessionID string, projectId int, tenantID uint64) {
	if video != nil && video.Status == StatusFailed {
		s.log.Info(ctx, "Resubmitting session video job for failed status",
			"sessionID", sessionID, "projectID", projectId, "tenantID", tenantID,
			"previousStatus", video.Status)
	} else {
		s.log.Info(ctx, "Submitting new session video job",
			"sessionID", sessionID, "projectID", projectId, "tenantID", tenantID)
	}
}

func (s *sessionVideosImpl) ExportSessionVideo(projectId int, userId uint64, tenantID uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error) {
	if s.sessionBatchService == nil {
		s.log.Error(s.ctx, "Session batch service not available")
		return nil, ErrServiceUnavailable
	}

	// Security check
	if err := s.validateSessionAccess(s.ctx, req.SessionID, projectId, userId, "export"); err != nil {
		return nil, err
	}

	// Check existing video
	existingVideo, _ := s.jobHandler.GetSessionVideoBySessionAndProject(s.ctx, req.SessionID, projectId)
	s.logExistingVideoInfo(s.ctx, existingVideo, req.SessionID, projectId, tenantID)

	// Return existing video if not failed
	if existingVideo != nil && existingVideo.Status != StatusFailed {
		s.log.Info(s.ctx, "Session video already exists with non-failed status",
			"sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID, "status", existingVideo.Status)
		return s.createExportResponse(existingVideo), nil
	}

	// Submit new job
	s.logJobSubmission(s.ctx, existingVideo, req.SessionID, projectId, tenantID)

	jwt, err := s.jwtProvider.GenerateServiceAccountJWT(s.ctx, int(tenantID))
	if err != nil {
		s.log.Error(s.ctx, "Failed to generate service account JWT", "error", err, "tenantID", tenantID)
		return nil, ErrAuthenticationFailed
	}

	sessionJobReq := &SessionJobRequest{
		ProjectID: projectId,
		SessionID: req.SessionID,
		JWT:       jwt,
	}

	result, err := s.sessionBatchService.SubmitSessionVideoJob(s.ctx, sessionJobReq)
	if err != nil {
		return nil, err
	}

	if err := s.jobHandler.CreateSessionVideoRecord(s.ctx, req.SessionID, projectId, userId, result.JobID); err != nil {
		s.log.Error(s.ctx, "Failed to create session video record", "error", err, "sessionID", req.SessionID, "jobID", result.JobID)
	}

	return &SessionVideoExportResponse{
		Status: StatusPending,
		JobID:  result.JobID,
	}, nil
}

func (s *sessionVideosImpl) GetAll(projectId int, userId uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error) {
	return s.jobHandler.GetAllSessionVideos(s.ctx, projectId, userId, req)
}

func (s *sessionVideosImpl) DeleteSessionVideo(projectId int, userId uint64, sessionId string) (interface{}, error) {
	if err := s.validateSessionAccess(s.ctx, sessionId, projectId, userId, "deletion"); err != nil {
		return nil, err
	}

	if err := s.jobHandler.DeleteSessionVideo(s.ctx, projectId, userId, sessionId); err != nil {
		return nil, err
	}

	return map[string]string{"status": "deleted"}, nil
}

func (s *sessionVideosImpl) validateVideoForDownload(video *SessionVideo, sessionId string, projectId int, userId uint64) error {
	if video == nil {
		s.log.Warn(s.ctx, "Session video not found", "sessionId", sessionId, "projectId", projectId, "userId", userId)
		return ErrVideoNotFound
	}

	if video.Status != StatusCompleted {
		s.log.Warn(s.ctx, "Session video is not completed", "sessionId", sessionId, "status", video.Status, "projectId", projectId, "userId", userId)
		return ErrVideoNotReady
	}

	if video.FileURL == "" {
		s.log.Warn(s.ctx, "Session video file URL is empty", "sessionId", sessionId, "projectId", projectId, "userId", userId)
		return ErrFileNotAvailable
	}

	return nil
}

func (s *sessionVideosImpl) DownloadSessionVideo(projectId int, userId uint64, sessionId string) (string, error) {
	if err := s.validateSessionAccess(s.ctx, sessionId, projectId, userId, "download"); err != nil {
		return "", err
	}

	video, err := s.jobHandler.GetSessionVideoBySessionAndProject(s.ctx, sessionId, projectId)
	if err != nil {
		s.log.Error(s.ctx, "Failed to get session video from database", "error", err, "sessionId", sessionId, "projectId", projectId, "userId", userId)
		return "", fmt.Errorf("unable to retrieve session video")
	}

	if err := s.validateVideoForDownload(video, sessionId, projectId, userId); err != nil {
		return "", err
	}

	if s.objStorage == nil {
		s.log.Error(s.ctx, "Object storage not available", "sessionId", sessionId, "projectId", projectId, "userId", userId)
		return "", ErrDownloadUnavailable
	}

	preSignedURL, err := s.objStorage.GetPreSignedDownloadUrl(video.FileURL)
	if err != nil {
		s.log.Error(s.ctx, "Failed to generate pre-signed download URL", "error", err, "sessionId", sessionId, "fileURL", video.FileURL)
		return "", ErrUnableToGenerateLink
	}

	s.log.Info(s.ctx, "Generated pre-signed download URL for session video", "sessionId", sessionId, "projectId", projectId, "userId", userId, "fileURL", video.FileURL)
	return preSignedURL, nil
}
