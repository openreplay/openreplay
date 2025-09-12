package session_videos

import (
	"context"
	"fmt"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/analytics/session_videos/jwt"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/auth"
)

type SessionVideos interface {
	ExportSessionVideo(projectId int, userId uint64, tenantID uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error)
	GetAll(projectId int, userId uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error)
	DeleteSessionVideo(projectId int, userId uint64, videoId string) (interface{}, error)
	DownloadSessionVideo(projectId int, userId uint64, videoId string) (string, error)
	StartKafkaConsumer() error
	StopKafkaConsumer()
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
}

func New(log logger.Logger, cfg *config.Config, pgconn pool.Pool, auth auth.Auth) SessionVideos {
	sessionBatchService, err := NewSessionBatchService(&cfg.SessionVideosConfig, log)
	if err != nil {
		log.Error(context.Background(), "Failed to create session batch service", "error", err)

	}

	jobHandler := NewDatabaseJobHandler(log, pgconn)
	jwtProvider := jwt.NewServiceJWTProvider(log, pgconn, cfg)

	var kafkaConsumer *SessionVideoConsumer
	if cfg.SessionVideosConfig.VideoKafkaTopic != "" {
		kafkaConsumer, err = NewSessionVideoConsumer(
			"session-videos-consumer", // group ID
			[]string{cfg.SessionVideosConfig.VideoKafkaTopic},
			jobHandler,
			log,
		)
		if err != nil {
			log.Error(context.Background(), "Failed to create session video consumer with base64 support", "error", err)

			kafkaConsumer = nil
		}
	}

	return &sessionVideosImpl{
		ctx:                 context.Background(),
		log:                 log,
		pgconn:              pgconn,
		cfg:                 cfg,
		sessionBatchService: sessionBatchService,
		kafkaConsumer:       kafkaConsumer,
		jobHandler:          jobHandler,
		jwtProvider:         jwtProvider,
		auth:                auth,
	}
}

func (s *sessionVideosImpl) ExportSessionVideo(projectId int, userId uint64, tenantID uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error) {
	if s.sessionBatchService == nil {
		s.log.Error(s.ctx, "Session batch service not available")
		return nil, fmt.Errorf("Session batch service not initialized")
	}

	// Check if record already exists by session_id and project_id
	s.log.Debug(s.ctx, "Checking for existing session video record", "sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID)
	existingVideo, _ := s.jobHandler.GetSessionVideoBySessionAndProject(s.ctx, req.SessionID, projectId)

	if existingVideo == nil {
		s.log.Debug(s.ctx, "No existing session video found, will create new job", "sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID)
	} else {
		s.log.Debug(s.ctx, "Found existing session video", "sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID, "status", existingVideo.Status, "jobID", existingVideo.JobID)
	}

	// If record exists and status is not failed, return current details
	if existingVideo != nil && existingVideo.Status != "failed" {
		s.log.Info(s.ctx, "Session video already exists with non-failed status",
			"sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID, "status", existingVideo.Status)

		response := &SessionVideoExportResponse{
			Status: existingVideo.Status,
			JobID:  existingVideo.JobID,
		}

		if existingVideo.FileURL != "" {
			response.FileURL = existingVideo.FileURL
		}

		return response, nil
	}

	// Submit new job if no record exists or status is failed
	if existingVideo != nil && existingVideo.Status == "failed" {
		s.log.Info(s.ctx, "Resubmitting session video job for failed status",
			"sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID, "previousStatus", existingVideo.Status)
	} else {
		s.log.Info(s.ctx, "Submitting new session video job",
			"sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID)
	}

	// Generate JWT token for service account
	jwt, err := s.jwtProvider.GenerateServiceAccountJWT(s.ctx, int(tenantID))
	if err != nil {
		s.log.Error(s.ctx, "Failed to generate service account JWT", "error", err, "tenantID", tenantID)
		return nil, fmt.Errorf("failed to generate service account JWT: %w", err)
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

	err = s.jobHandler.CreateSessionVideoRecord(s.ctx, req.SessionID, projectId, userId, result.JobID)
	if err != nil {
		s.log.Error(s.ctx, "Failed to create session video record", "error", err, "sessionID", req.SessionID, "jobID", result.JobID)
	}

	return &SessionVideoExportResponse{
		Status: "pending",
		JobID:  result.JobID,
	}, nil
}

func (s *sessionVideosImpl) GetAll(projectId int, userId uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error) {
	return s.jobHandler.GetAllSessionVideos(s.ctx, projectId, userId, req)
}

func (s *sessionVideosImpl) DeleteSessionVideo(projectId int, userId uint64, videoId string) (interface{}, error) {
	err := s.jobHandler.DeleteSessionVideo(s.ctx, projectId, userId, videoId)
	if err != nil {
		return nil, err
	}

	return map[string]string{
		"status": "deleted",
	}, nil
}

func (s *sessionVideosImpl) DownloadSessionVideo(projectId int, userId uint64, videoId string) (string, error) {
	dummyWebMURL := "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.webm"
	s.log.Info(s.ctx, "Returning dummy WebM file for download", "videoId", videoId, "projectId", projectId, "userId", userId, "url", dummyWebMURL)
	return dummyWebMURL, nil
}

func (s *sessionVideosImpl) StartKafkaConsumer() error {
	if s.kafkaConsumer == nil {
		s.log.Warn(s.ctx, "Session video consumer not available")
		return fmt.Errorf("Session video consumer not initialized")
	}

	s.log.Info(s.ctx, "Starting session video consumer with queue infrastructure")
	return s.kafkaConsumer.Start()
}

func (s *sessionVideosImpl) StopKafkaConsumer() {
	if s.kafkaConsumer == nil {
		s.log.Warn(s.ctx, "Session video consumer not available")
		return
	}

	s.log.Info(s.ctx, "Stopping session video consumer with queue infrastructure")
	s.kafkaConsumer.Stop()
}
