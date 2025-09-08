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
}

type sessionVideosImpl struct {
	ctx          context.Context
	log          logger.Logger
	pgconn       pool.Pool
	cfg          *config.Config
	batchService *BatchService
}

func New(log logger.Logger, cfg *config.Config, pgconn pool.Pool) SessionVideos {
	batchService, err := NewBatchService(&cfg.SessionVideosConfig, log)
	if err != nil {
		log.Error(context.Background(), "Failed to create AWS Batch service", "error", err)
		// Continue without batch service - methods will handle nil check
	}

	return &sessionVideosImpl{
		ctx:          context.Background(),
		log:          log,
		pgconn:       pgconn,
		cfg:          cfg,
		batchService: batchService,
	}
}

func (s *sessionVideosImpl) ExportSessionVideo(projectId int, userId uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error) {
	if s.batchService == nil {
		s.log.Error(s.ctx, "AWS Batch service not available")
		return nil, fmt.Errorf("AWS Batch service not initialized")
	}

	// TODO - check if video exists in DB and return the file URL
	// TODO - generate a JWT token to run the export job
	jwt := "dummy-jwt-token"

	// Submit job to AWS Batch using the batch service
	batchReq := &BatchJobRequest{
		ProjectID: projectId,
		SessionID: req.SessionID,
		JWT:       jwt,
	}

	result, err := s.batchService.SubmitJob(s.ctx, batchReq)
	if err != nil {
		return nil, err
	}

	// TODO - save the request in DB with status "pending"

	return &SessionVideoExportResponse{
		Status: "pending",
		JobID:  result.JobID,
	}, nil
}

func (s *sessionVideosImpl) GetAll(projectId int, userId uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error) {
	// TODO - fetch from DB

	resp := make([]SessionVideo, 0)
	for i := 0; i < 5; i++ {
		resp = append(resp, SessionVideo{
			VideoID:    "video-id-" + string(i),
			SessionID:  "session-id-" + string(i),
			ProjectID:  projectId,
			UserID:     userId,
			FileURL:    "https://example.com/video/" + string(i),
			Status:     "completed",
			CreatedAt:  1625247600 + int64(i*1000),
			ModifiedAt: 1625247600 + int64(i*1000),
		})
	}
	return &GetSessionVideosResponse{
		Videos: resp,
		Total:  len(resp) + 10, // Dummy total count
	}, nil
}

func (s *sessionVideosImpl) DeleteSessionVideo(projectId int, userId uint64, videoId string) (interface{}, error) {
	// TODO - delete from DB
	return map[string]string{
		"status": "deleted",
	}, nil
}

func (s *sessionVideosImpl) DownloadSessionVideo(projectId int, userId uint64, videoId string) (string, error) {
	// TODO - fetch the file URL from DB
	// TODO - generate a pre-signed URL if stored in S3 or similar
	// TODO - return the file URL

	dummyWebMURL := "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.webm"
	s.log.Info(s.ctx, "Returning dummy WebM file for download", "videoId", videoId, "projectId", projectId, "userId", userId, "url", dummyWebMURL)
	return dummyWebMURL, nil
}
