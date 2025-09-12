package session_videos

import (
	"context"
	"fmt"
	"strconv"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/aws/batch"
	"openreplay/backend/pkg/logger"

	awsbatch "github.com/aws/aws-sdk-go/service/batch"
)

type SessionBatchService struct {
	batchService *batch.Service
	cfg          *config.SessionVideosConfig
	log          logger.Logger
}

type SessionJobRequest struct {
	ProjectID int
	SessionID string
	JWT       string
	EnvVars   map[string]string // Additional environment variables (optional)
}

func NewSessionBatchService(cfg *config.SessionVideosConfig, log logger.Logger) (*SessionBatchService, error) {
	// Create generic batch config from session videos config
	batchConfig := &batch.Config{
		AWSRegion:     cfg.AWSRegion,
		JobQueue:      cfg.BatchJobQueue,
		JobDefinition: cfg.BatchJobDefinition,
		JobBaseName:   cfg.BatchJobBaseName,
		RetryAttempts: cfg.BatchRetryAttempts,
	}

	// Create the generic batch service
	batchService, err := batch.NewService(batchConfig, log)
	if err != nil {
		return nil, fmt.Errorf("session video export service is temporarily unavailable")
	}

	return &SessionBatchService{
		batchService: batchService,
		cfg:          cfg,
		log:          log,
	}, nil
}

func (sbs *SessionBatchService) getVideoConfigEnvVars() map[string]string {
	envVars := make(map[string]string)

	envVars["WIDTH"] = strconv.Itoa(sbs.cfg.VideoWidth)
	envVars["HEIGHT"] = strconv.Itoa(sbs.cfg.VideoHeight)
	envVars["FPS"] = strconv.Itoa(sbs.cfg.VideoFPS)
	envVars["SPEED"] = strconv.Itoa(sbs.cfg.VideoSpeed)
	envVars["MODE"] = sbs.cfg.VideoMode
	envVars["OUTDIR"] = sbs.cfg.VideoOutputDir
	envVars["BASEURL"] = sbs.cfg.VideoBaseURL
	envVars["KAFKA_TOPIC"] = sbs.cfg.VideoKafkaTopic

	if sbs.cfg.KafkaServers != "" {
		envVars["KAFKA_SERVERS"] = sbs.cfg.KafkaServers
	}

	return envVars
}

func (sbs *SessionBatchService) mergeEnvVars(additionalEnvVars map[string]string) map[string]string {
	envVars := sbs.getVideoConfigEnvVars()

	// Add or override with additional environment variables
	for key, value := range additionalEnvVars {
		envVars[key] = value
	}

	return envVars
}

func (sbs *SessionBatchService) buildJobName(projectID int, sessionID string) string {
	return fmt.Sprintf("%s_%d-%s", sbs.cfg.BatchJobBaseName, projectID, sessionID)
}

func (sbs *SessionBatchService) buildCommand(projectID int, sessionID, jwt string) []string {
	return []string{
		"node",
		"index.js",
		"-p",
		strconv.Itoa(projectID),
		"-s",
		sessionID,
		"-j",
		jwt,
	}
}

func (sbs *SessionBatchService) SubmitSessionVideoJob(ctx context.Context, req *SessionJobRequest) (*batch.JobResponse, error) {
	// Build job name
	jobName := sbs.buildJobName(req.ProjectID, req.SessionID)

	// Build command
	command := sbs.buildCommand(req.ProjectID, req.SessionID, req.JWT)

	// Merge environment variables
	var envVars map[string]string
	if req.EnvVars != nil {
		envVars = sbs.mergeEnvVars(req.EnvVars)
	} else {
		envVars = sbs.getVideoConfigEnvVars()
	}

	// Create batch job request
	batchReq := &batch.JobRequest{
		JobName: jobName,
		Command: command,
		EnvVars: envVars,
	}

	sbs.log.Info(ctx, "Submitting session video export job",
		"projectId", req.ProjectID,
		"sessionId", req.SessionID,
		"jobName", jobName)

	// Submit to generic batch service
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

func (sbs *SessionBatchService) GetJobStatus(ctx context.Context, jobID string) (*awsbatch.JobDetail, error) {
	return sbs.batchService.GetJobStatus(ctx, jobID)
}

func (sbs *SessionBatchService) CancelJob(ctx context.Context, jobID string, reason string) error {
	return sbs.batchService.CancelJob(ctx, jobID, reason)
}

func (sbs *SessionBatchService) ListJobs(ctx context.Context, jobStatus string) ([]*awsbatch.JobSummary, error) {
	return sbs.batchService.ListJobs(ctx, sbs.cfg.BatchJobQueue, jobStatus)
}
