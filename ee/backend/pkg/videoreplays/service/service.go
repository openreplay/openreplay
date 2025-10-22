package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"openreplay/backend/pkg/server/user"
	"time"

	config "openreplay/backend/internal/config/videoreplays"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/objectstorage"
)

type SessionVideos interface {
	ExportSessionVideo(projectId int, userId uint64, tenantID uint64, req *SessionVideoExportRequest) (*SessionVideoExportResponse, error)
	GetAll(projectId int, userId uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error)
	DeleteSessionVideo(projectId int, userId uint64, sessionId string) (interface{}, error)
	DownloadSessionVideo(projectId int, userId uint64, sessionId string) (string, error)
	Iterate(batchData []byte, batchInfo *messages.BatchInfo) // for queue consumer support
}

type sessionVideosImpl struct {
	cfg        *config.Config
	log        logger.Logger
	ctx        context.Context
	storage    *Storage
	batchJobs  BatchJobs
	user       user.Users
	objStorage objectstorage.ObjectStorage
}

func New(log logger.Logger, cfg *config.Config, storage *Storage, batchJobs BatchJobs, objStore objectstorage.ObjectStorage, user user.Users) (SessionVideos, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is required")
	case cfg == nil:
		return nil, errors.New("config is required")
	case storage == nil:
		return nil, errors.New("storage is required")
	case batchJobs == nil:
		return nil, errors.New("batchJobs is required")
	case user == nil:
		return nil, errors.New("user is required")
	case objStore == nil:
		return nil, errors.New("objStore is required")
	}
	return &sessionVideosImpl{
		cfg:        cfg,
		log:        log,
		ctx:        context.Background(),
		storage:    storage,
		batchJobs:  batchJobs,
		user:       user,
		objStorage: objStore,
	}, nil
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
	existingVideo, _ := s.storage.GetSessionVideoBySessionAndProject(s.ctx, req.SessionID, projectId)
	s.logExistingVideoInfo(s.ctx, existingVideo, req.SessionID, projectId, tenantID)

	// Return existing video if not failed
	if existingVideo != nil && existingVideo.Status != StatusFailed {
		s.log.Info(s.ctx, "Session video already exists with non-failed status",
			"sessionID", req.SessionID, "projectID", projectId, "tenantID", tenantID, "status", existingVideo.Status)
		return existingVideo.Response(), nil
	}

	s.logJobSubmission(s.ctx, existingVideo, req.SessionID, projectId, tenantID)

	serviceAccount, err := s.user.GetServiceAccount(tenantID)
	if err != nil {
		s.log.Error(s.ctx, "Failed to get service account", "error", err, "tenantID", tenantID)
		return nil, ErrAuthenticationFailed
	}

	jwt, err := user.GenerateJWT(serviceAccount.ID, tenantID, 3600*time.Second, s.cfg.JWTSecret)
	if err != nil {
		s.log.Error(s.ctx, "Failed to generate service account JWT", "error", err, "tenantID", tenantID)
		return nil, ErrAuthenticationFailed
	}

	sessionJobReq := &SessionJobRequest{
		ProjectID: projectId,
		SessionID: req.SessionID,
		JWT:       jwt,
	}

	result, err := s.batchJobs.SubmitJob(s.ctx, sessionJobReq)
	if err != nil {
		return nil, err
	}

	if err = s.storage.CreateSessionVideoRecord(s.ctx, req.SessionID, projectId, userId, result.JobID); err != nil {
		s.log.Error(s.ctx, "Failed to create session video record", "error", err, "sessionID", req.SessionID, "jobID", result.JobID)
	}

	return &SessionVideoExportResponse{
		Status: StatusPending,
		JobID:  result.JobID,
	}, nil
}

func (s *sessionVideosImpl) GetAll(projectId int, userId uint64, req *SessionVideosGetRequest) (*GetSessionVideosResponse, error) {
	return s.storage.GetAllSessionVideos(s.ctx, projectId, userId, req)
}

func (s *sessionVideosImpl) DeleteSessionVideo(projectId int, userId uint64, sessionId string) (interface{}, error) {
	if err := s.storage.DeleteSessionVideo(s.ctx, projectId, userId, sessionId); err != nil {
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
	video, err := s.storage.GetSessionVideoBySessionAndProject(s.ctx, sessionId, projectId)
	if err != nil {
		s.log.Error(s.ctx, "Failed to get session video from database", "error", err, "sessionId", sessionId, "projectId", projectId, "userId", userId)
		return "", fmt.Errorf("unable to retrieve session video")
	}

	if err := s.validateVideoForDownload(video, sessionId, projectId, userId); err != nil {
		return "", err
	}

	preSignedURL, err := s.objStorage.GetPreSignedDownloadUrl(video.FileURL)
	if err != nil {
		s.log.Error(s.ctx, "Failed to generate pre-signed download URL", "error", err, "sessionId", sessionId, "fileURL", video.FileURL)
		return "", ErrUnableToGenerateLink
	}

	s.log.Info(s.ctx, "Generated pre-signed download URL for session video", "sessionId", sessionId, "projectId", projectId, "userId", userId, "fileURL", video.FileURL)
	return preSignedURL, nil
}

func (s *sessionVideosImpl) Iterate(batchData []byte, batchInfo *messages.BatchInfo) {
	var jobMessage SessionVideoJobMessage
	if err := json.Unmarshal(batchData, &jobMessage); err != nil {
		s.log.Error(context.Background(), "Failed to unmarshal session video job message", "error", err)
		return
	}

	sessionId := jobMessage.SessionId
	if jobMessage.SessionId == "" {
		s.log.Error(s.ctx, "Invalid session ID in job message")
		return
	}

	ctx := context.WithValue(context.Background(), "sessionID", sessionId)

	s.log.Info(ctx, "Processing video job message",
		"s3Path", jobMessage.Name,
		"sessionId", sessionId,
		"status", jobMessage.Status,
		"error", jobMessage.Error)

	if err := s.storage.HandleJobCompletion(sessionId, &jobMessage); err != nil {
		s.log.Error(ctx, "Failed to handle job completion", "error", err, "sessionID", sessionId)
	}

	s.log.Debug(ctx, "Successfully processed session video job completion", "sessionID", sessionId)
}
