package session_videos

import (
	"context"
	"fmt"
	"strconv"

	config "openreplay/backend/internal/config/analytics"
	"openreplay/backend/pkg/logger"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/batch"
)

// BatchService provides AWS Batch functionality for session video processing
type BatchService struct {
	client *batch.Batch
	cfg    *config.SessionVideosConfig
	log    logger.Logger
}

// BatchJobRequest contains the parameters needed to submit a batch job
type BatchJobRequest struct {
	ProjectID int
	SessionID string
	JWT       string
	EnvVars   map[string]string
}

// BatchJobResponse contains the response from submitting a batch job
type BatchJobResponse struct {
	JobID   string
	JobName string
}

// NewBatchService creates a new AWS Batch service instance
func NewBatchService(cfg *config.SessionVideosConfig, log logger.Logger) (*BatchService, error) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(cfg.AWSRegion),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	return &BatchService{
		client: batch.New(sess),
		cfg:    cfg,
		log:    log,
	}, nil
}

// getVideoConfigEnvVars returns environment variables from video configuration
func (bs *BatchService) getVideoConfigEnvVars() map[string]string {
	envVars := make(map[string]string)

	envVars["WIDTH"] = strconv.Itoa(bs.cfg.VideoWidth)
	envVars["HEIGHT"] = strconv.Itoa(bs.cfg.VideoHeight)
	envVars["FPS"] = strconv.Itoa(bs.cfg.VideoFPS)
	envVars["SPEED"] = strconv.Itoa(bs.cfg.VideoSpeed)
	envVars["MODE"] = bs.cfg.VideoMode
	envVars["OUTDIR"] = bs.cfg.VideoOutputDir
	envVars["BASEURL"] = bs.cfg.VideoBaseURL
	envVars["KAFKA_TOPIC"] = bs.cfg.VideoKafkaTopic

	if bs.cfg.KafkaServers != "" {
		envVars["KAFKA_SERVERS"] = bs.cfg.KafkaServers
	}

	return envVars
}

// SubmitJob submits a session video export job to AWS Batch
func (bs *BatchService) SubmitJob(ctx context.Context, req *BatchJobRequest) (*BatchJobResponse, error) {
	jobName := fmt.Sprintf("%s_%d-%s", bs.cfg.BatchJobBaseName, req.ProjectID, req.SessionID)

	command := []*string{
		aws.String("node"),
		aws.String("index.js"),
		aws.String("-p"),
		aws.String(strconv.Itoa(req.ProjectID)),
		aws.String("-s"),
		aws.String(req.SessionID),
		aws.String("-j"),
		aws.String(req.JWT),
	}

	// Prepare environment variables from video config
	var envVars []*batch.KeyValuePair
	videoEnvVars := bs.getVideoConfigEnvVars()
	for key, value := range videoEnvVars {
		envVars = append(envVars, &batch.KeyValuePair{
			Name:  aws.String(key),
			Value: aws.String(value),
		})
	}

	// Add job-specific environment variables
	if req.EnvVars != nil {
		for key, value := range req.EnvVars {
			envVars = append(envVars, &batch.KeyValuePair{
				Name:  aws.String(key),
				Value: aws.String(value),
			})
		}
	}

	input := &batch.SubmitJobInput{
		JobName:       aws.String(jobName),
		JobQueue:      aws.String(bs.cfg.BatchJobQueue),
		JobDefinition: aws.String(bs.cfg.BatchJobDefinition),
		ContainerOverrides: &batch.ContainerOverrides{
			Command:     command,
			Environment: envVars,
		},
		RetryStrategy: &batch.RetryStrategy{
			Attempts: aws.Int64(int64(bs.cfg.BatchRetryAttempts)),
		},
	}

	bs.log.Info(ctx, "Submitting AWS Batch job",
		"jobName", jobName,
		"jobQueue", bs.cfg.BatchJobQueue,
		"jobDefinition", bs.cfg.BatchJobDefinition,
		"projectId", req.ProjectID,
		"sessionId", req.SessionID)

	result, err := bs.client.SubmitJobWithContext(ctx, input)
	if err != nil {
		bs.log.Error(ctx, "Failed to submit AWS Batch job",
			"error", err,
			"projectId", req.ProjectID,
			"sessionId", req.SessionID,
			"jobName", jobName)
		return nil, fmt.Errorf("failed to submit batch job: %w", err)
	}

	bs.log.Info(ctx, "Successfully submitted AWS Batch job",
		"jobId", *result.JobId,
		"jobName", *result.JobName,
		"projectId", req.ProjectID,
		"sessionId", req.SessionID)

	return &BatchJobResponse{
		JobID:   *result.JobId,
		JobName: *result.JobName,
	}, nil
}

// GetJobStatus retrieves the status of a batch job
func (bs *BatchService) GetJobStatus(ctx context.Context, jobID string) (*batch.JobDetail, error) {
	input := &batch.DescribeJobsInput{
		Jobs: []*string{aws.String(jobID)},
	}

	result, err := bs.client.DescribeJobsWithContext(ctx, input)
	if err != nil {
		bs.log.Error(ctx, "Failed to describe batch job", "error", err, "jobId", jobID)
		return nil, fmt.Errorf("failed to describe job: %w", err)
	}

	if len(result.Jobs) == 0 {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}

	return result.Jobs[0], nil
}

// CancelJob cancels a running batch job
func (bs *BatchService) CancelJob(ctx context.Context, jobID string, reason string) error {
	input := &batch.CancelJobInput{
		JobId:  aws.String(jobID),
		Reason: aws.String(reason),
	}

	_, err := bs.client.CancelJobWithContext(ctx, input)
	if err != nil {
		bs.log.Error(ctx, "Failed to cancel batch job", "error", err, "jobId", jobID)
		return fmt.Errorf("failed to cancel job: %w", err)
	}

	bs.log.Info(ctx, "Successfully cancelled batch job", "jobId", jobID, "reason", reason)
	return nil
}

// ListJobs lists batch jobs with optional filters
func (bs *BatchService) ListJobs(ctx context.Context, jobQueue string, jobStatus string) ([]*batch.JobSummary, error) {
	input := &batch.ListJobsInput{
		JobQueue: aws.String(jobQueue),
	}

	if jobStatus != "" {
		input.JobStatus = aws.String(jobStatus)
	}

	result, err := bs.client.ListJobsWithContext(ctx, input)
	if err != nil {
		bs.log.Error(ctx, "Failed to list batch jobs", "error", err, "jobQueue", jobQueue, "jobStatus", jobStatus)
		return nil, fmt.Errorf("failed to list jobs: %w", err)
	}

	return result.JobSummaryList, nil
}
