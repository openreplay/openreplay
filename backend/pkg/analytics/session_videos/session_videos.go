package session_videos

import (
	"context"
	"fmt"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type SessionVideos interface {
	ExportSessionVideo(projectId int, userId uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error)
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
}

func New(log logger.Logger, cfg *config.Config, pgconn pool.Pool) SessionVideos {
	sessionBatchService, err := NewSessionBatchService(&cfg.SessionVideosConfig, log)
	if err != nil {
		log.Error(context.Background(), "Failed to create session batch service", "error", err)

	}

	jobHandler := NewDatabaseJobHandler(log, pgconn)
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
	}
}

func (s *sessionVideosImpl) ExportSessionVideo(projectId int, userId uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error) {
	if s.sessionBatchService == nil {
		s.log.Error(s.ctx, "Session batch service not available")
		return nil, fmt.Errorf("Session batch service not initialized")
	}

	// Check if record already exists by session_id and project_id
	existingVideo, err := s.jobHandler.GetSessionVideoBySessionAndProject(s.ctx, req.SessionID, projectId)
	if err != nil {
		s.log.Error(s.ctx, "Failed to check existing session video", "error", err, "sessionID", req.SessionID, "projectID", projectId)
		return nil, fmt.Errorf("failed to check existing session video: %w", err)
	}

	// If record exists and status is not failed, return current details
	if existingVideo != nil && existingVideo.Status != "failed" {
		s.log.Info(s.ctx, "Session video already exists with non-failed status",
			"sessionID", req.SessionID, "projectID", projectId, "status", existingVideo.Status)

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
			"sessionID", req.SessionID, "projectID", projectId, "previousStatus", existingVideo.Status)
	} else {
		s.log.Info(s.ctx, "Submitting new session video job",
			"sessionID", req.SessionID, "projectID", projectId)
	}

	jwt := "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI4MiwidGVuYW50SWQiOjExNSwiZXhwIjoxNzU3MzQwMDc0LCJpc3MiOiJvcGVucmVwbGF5LXNhYXMiLCJpYXQiOjE3NTczMjU2NzQsImF1ZCI6ImZyb250Ok9wZW5SZXBsYXkifQ.5lGbXOxk9GdeqNroUxKKITbHaoUx-CRV80-DrIqnTFR-AhQFdv9gfF_YJAw8rKaXpuUEsCPqL0DCvh-D_mbDIw"
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
	resp := make([]SessionVideo, 0)
	for i := 0; i < 5; i++ {
		resp = append(resp, SessionVideo{
			VideoID:    "video-id-" + string(rune(i+'0')),
			SessionID:  "session-id-" + string(rune(i+'0')),
			ProjectID:  projectId,
			UserID:     userId,
			FileURL:    "https://example.com/video/" + string(rune(i+'0')),
			Status:     "completed",
			CreatedAt:  1625247600 + int64(i*1000),
			ModifiedAt: 1625247600 + int64(i*1000),
		})
	}
	return &GetSessionVideosResponse{
		Videos: resp,
		Total:  len(resp) + 10,
	}, nil
}

func (s *sessionVideosImpl) DeleteSessionVideo(projectId int, userId uint64, videoId string) (interface{}, error) {
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
