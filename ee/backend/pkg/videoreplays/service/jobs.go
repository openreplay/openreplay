package service

import (
	"context"
	"fmt"
	"strconv"

	config "openreplay/backend/internal/config/videoreplays"
	"openreplay/backend/pkg/aws/batch"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/logger"
)

type SessionJobRequest struct {
	ProjectID int
	SessionID uint64
	JWT       string
}

type BatchJobs interface {
	SubmitJob(ctx context.Context, req *SessionJobRequest) (*batch.JobResponse, error)
}

type batchJobs struct {
	cfg          *config.Config
	log          logger.Logger
	batchService *batch.Service
	defaultVars  map[string]string
}

func NewSessionBatchService(log logger.Logger, cfg *config.Config) (BatchJobs, error) {
	batchConfig := &batch.Config{
		AWSRegion:     cfg.AWSRegion,
		JobQueue:      cfg.BatchJobQueue,
		JobDefinition: cfg.BatchJobDefinition,
		JobBaseName:   cfg.BatchJobBaseName,
		RetryAttempts: cfg.BatchRetryAttempts,
	}

	batchService, err := batch.NewService(batchConfig, log)
	if err != nil {
		return nil, fmt.Errorf("session video export service is temporarily unavailable")
	}

	return &batchJobs{
		batchService: batchService,
		cfg:          cfg,
		log:          log,
		defaultVars:  buildDefaultConfig(cfg),
	}, nil
}

func buildDefaultConfig(cfg *config.Config) map[string]string {
	envVars := make(map[string]string)
	envVars["BUCKET"] = cfg.BucketName
	envVars["WIDTH"] = strconv.Itoa(cfg.VideoWidth)
	envVars["HEIGHT"] = strconv.Itoa(cfg.VideoHeight)
	envVars["FPS"] = strconv.Itoa(cfg.VideoFPS)
	envVars["SPEED"] = strconv.Itoa(cfg.VideoSpeed)
	envVars["MODE"] = cfg.VideoMode
	envVars["OUTDIR"] = cfg.VideoOutputDir
	envVars["BASEURL"] = cfg.VideoBaseURL
	envVars["KAFKA_TOPIC"] = cfg.TopicSessionVideoReplay
	envVars["KAFKA_SERVERS"] = env.String("KAFKA_SERVERS")
	return envVars
}

func (sbs *batchJobs) buildJobName(projectID int, sessionID uint64) string {
	return fmt.Sprintf("%s_%d-%d", sbs.cfg.BatchJobBaseName, projectID, sessionID)
}

func (sbs *batchJobs) buildCommand(projectID int, sessionID uint64, jwt string) []string {
	return []string{
		"node",
		"index.js",
		"-p",
		strconv.Itoa(projectID),
		"-s",
		strconv.FormatUint(sessionID, 10),
		"-j",
		jwt,
	}
}

func (sbs *batchJobs) SubmitJob(ctx context.Context, req *SessionJobRequest) (*batch.JobResponse, error) {
	batchReq := &batch.JobRequest{
		JobName: sbs.buildJobName(req.ProjectID, req.SessionID),
		Command: sbs.buildCommand(req.ProjectID, req.SessionID, req.JWT),
		EnvVars: sbs.defaultVars,
	}

	sbs.log.Info(ctx, "Submitting session video export job",
		"projectId", req.ProjectID,
		"sessionId", req.SessionID,
		"jobName", batchReq.JobName)

	result, err := sbs.batchService.SubmitJob(ctx, batchReq)
	if err != nil {
		sbs.log.Error(ctx, "Failed to submit session video export job",
			"error", err,
			"projectId", req.ProjectID,
			"sessionId", req.SessionID)
		return nil, fmt.Errorf("unable to start session video export")
	}

	sbs.log.Info(ctx, "Successfully submitted session video export job",
		"jobId", result.JobID,
		"jobName", result.JobName,
		"projectId", req.ProjectID,
		"sessionId", req.SessionID)

	return result, nil
}
