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

// SessionBatchService provides session video specific AWS Batch functionality
type SessionBatchService struct {
	batchService *batch.Service
	cfg          *config.SessionVideosConfig
	log          logger.Logger
}

// SessionJobRequest contains the parameters needed to submit a session video job
type SessionJobRequest struct {
	ProjectID int
	SessionID string
	JWT       string
	EnvVars   map[string]string // Additional environment variables (optional)
}

// NewSessionBatchService creates a new session-specific batch service
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
		return nil, fmt.Errorf("failed to create batch service: %w", err)
	}

	return &SessionBatchService{
		batchService: batchService,
		cfg:          cfg,
		log:          log,
	}, nil
}

// getVideoConfigEnvVars returns environment variables from video configuration
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
		// envVars["KAFKA_SERVERS"] = sbs.cfg.KafkaServers // TODO: Uncomment after local testing
	}

	return envVars
}

// mergeEnvVars merges video configuration environment variables with additional environment variables
// Additional env vars will override video config env vars if there are conflicts
func (sbs *SessionBatchService) mergeEnvVars(additionalEnvVars map[string]string) map[string]string {
	envVars := sbs.getVideoConfigEnvVars()

	// Add or override with additional environment variables
	for key, value := range additionalEnvVars {
		envVars[key] = value
	}

	return envVars
}

// buildJobName creates a standardized job name for session video exports
func (sbs *SessionBatchService) buildJobName(projectID int, sessionID string) string {
	return fmt.Sprintf("%s_%d-%s", sbs.cfg.BatchJobBaseName, projectID, sessionID)
}

// buildCommand creates the command array for the session video export container
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

// SubmitSessionVideoJob submits a session video export job to AWS Batch
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
		return nil, fmt.Errorf("failed to submit session video job: %w", err)
	}

	sbs.log.Info(ctx, "Successfully submitted session video export job",
		"jobId", result.JobID,
		"jobName", result.JobName,
		"projectId", req.ProjectID,
		"sessionId", req.SessionID)

	return result, nil
}

// GetJobStatus retrieves the status of a batch job (delegates to generic batch service)
func (sbs *SessionBatchService) GetJobStatus(ctx context.Context, jobID string) (*awsbatch.JobDetail, error) {
	return sbs.batchService.GetJobStatus(ctx, jobID)
}

// CancelJob cancels a running batch job (delegates to generic batch service)
func (sbs *SessionBatchService) CancelJob(ctx context.Context, jobID string, reason string) error {
	return sbs.batchService.CancelJob(ctx, jobID, reason)
}

// ListJobs lists batch jobs with optional filters (delegates to generic batch service)
func (sbs *SessionBatchService) ListJobs(ctx context.Context, jobStatus string) ([]*awsbatch.JobSummary, error) {
	return sbs.batchService.ListJobs(ctx, sbs.cfg.BatchJobQueue, jobStatus)
}
