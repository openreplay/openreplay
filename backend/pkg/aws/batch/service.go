package batch

import (
	"context"
	"fmt"

	"openreplay/backend/pkg/logger"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/batch"
)

// Config contains configuration for AWS Batch
type Config struct {
	AWSRegion     string
	JobQueue      string
	JobDefinition string
	JobBaseName   string
	RetryAttempts int
}

// Service provides generic AWS Batch functionality
type Service struct {
	client *batch.Batch
	cfg    *Config
	log    logger.Logger
}

// JobRequest contains the parameters needed to submit a batch job
type JobRequest struct {
	JobName string
	Command []string
	EnvVars map[string]string // Environment variables
}

// JobResponse contains the response from submitting a batch job
type JobResponse struct {
	JobID   string
	JobName string
}

// NewService creates a new AWS Batch service instance
func NewService(cfg *Config, log logger.Logger) (*Service, error) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(cfg.AWSRegion),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	return &Service{
		client: batch.New(sess),
		cfg:    cfg,
		log:    log,
	}, nil
}

// SubmitJob submits a generic job to AWS Batch
func (bs *Service) SubmitJob(ctx context.Context, req *JobRequest) (*JobResponse, error) {
	// Convert command strings to AWS string pointers
	var command []*string
	for _, cmd := range req.Command {
		command = append(command, aws.String(cmd))
	}

	// Prepare environment variables
	var envVars []*batch.KeyValuePair
	if req.EnvVars != nil {
		for key, value := range req.EnvVars {
			envVars = append(envVars, &batch.KeyValuePair{
				Name:  aws.String(key),
				Value: aws.String(value),
			})
		}
	}

	input := &batch.SubmitJobInput{
		JobName:       aws.String(req.JobName),
		JobQueue:      aws.String(bs.cfg.JobQueue),
		JobDefinition: aws.String(bs.cfg.JobDefinition),
		ContainerOverrides: &batch.ContainerOverrides{
			Command:     command,
			Environment: envVars,
		},
		RetryStrategy: &batch.RetryStrategy{
			Attempts: aws.Int64(int64(bs.cfg.RetryAttempts)),
		},
	}

	bs.log.Info(ctx, "Submitting AWS Batch job",
		"jobName", req.JobName,
		"jobQueue", bs.cfg.JobQueue,
		"jobDefinition", bs.cfg.JobDefinition)

	result, err := bs.client.SubmitJobWithContext(ctx, input)
	if err != nil {
		bs.log.Error(ctx, "Failed to submit AWS Batch job",
			"error", err,
			"jobName", req.JobName)
		return nil, fmt.Errorf("failed to submit batch job: %w", err)
	}

	bs.log.Info(ctx, "Successfully submitted AWS Batch job",
		"jobId", *result.JobId,
		"jobName", *result.JobName)

	return &JobResponse{
		JobID:   *result.JobId,
		JobName: *result.JobName,
	}, nil
}

// GetJobStatus retrieves the status of a batch job
func (bs *Service) GetJobStatus(ctx context.Context, jobID string) (*batch.JobDetail, error) {
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
func (bs *Service) CancelJob(ctx context.Context, jobID string, reason string) error {
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
func (bs *Service) ListJobs(ctx context.Context, jobQueue string, jobStatus string) ([]*batch.JobSummary, error) {
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
