# AWS Batch Service

A generic, reusable AWS Batch service for submitting, monitoring, and managing batch jobs in Go applications.

## Features

- **Generic Design**: Can be used with any type of batch job, not tied to specific business logic
- **Job Submission**: Submit jobs with custom commands and environment variables
- **Job Monitoring**: Check job status and retrieve job details
- **Job Management**: Cancel running jobs and list jobs in queues
- **Error Handling**: Comprehensive error handling with detailed logging
- **AWS SDK Integration**: Built on top of the official AWS SDK for Go v1

## Installation

```go
import "openreplay/backend/pkg/aws/batch"
```

## Quick Start

### Basic Usage

```go
package main

import (
    "context"
    "log"
    
    "openreplay/backend/pkg/aws/batch"
    "openreplay/backend/pkg/logger"
)

func main() {
    // Create batch configuration
    cfg := &batch.Config{
        AWSRegion:     "us-east-1",
        JobQueue:      "my-job-queue",
        JobDefinition: "my-job-definition:1",
        JobBaseName:   "my-job",
        RetryAttempts: 3,
    }
    
    // Create batch service
    batchService, err := batch.NewService(cfg, logger.New())
    if err != nil {
        log.Fatal(err)
    }
    
    // Submit a job
    req := &batch.JobRequest{
        JobName: "my-job-123",
        Command: []string{"echo", "Hello, World!"},
        EnvVars: map[string]string{
            "ENV_VAR1": "value1",
            "ENV_VAR2": "value2",
        },
    }
    
    ctx := context.Background()
    result, err := batchService.SubmitJob(ctx, req)
    if err != nil {
        log.Fatal(err)
    }
    
    log.Printf("Job submitted: %s", result.JobID)
}
```

## Configuration

### Config

The `Config` struct contains all necessary configuration for connecting to AWS Batch:

```go
type Config struct {
    AWSRegion     string // AWS region (e.g., "us-east-1")
    JobQueue      string // AWS Batch job queue name
    JobDefinition string // AWS Batch job definition ARN or name
    JobBaseName   string // Base name for job naming (optional)
    RetryAttempts int    // Number of retry attempts for failed jobs
}
```

### Environment Variables

The service uses AWS SDK's default credential chain. Ensure you have AWS credentials configured via:

- Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- IAM roles (recommended for EC2/ECS)
- AWS credentials file (`~/.aws/credentials`)
- AWS profiles

## API Reference

### Service

#### NewService

```go
func NewService(cfg *Config, log logger.Logger) (*Service, error)
```

Creates a new AWS Batch service instance.

**Parameters:**
- `cfg`: Batch configuration
- `log`: Logger instance

**Returns:**
- `*Service`: Batch service instance
- `error`: Error if service creation fails

#### SubmitJob

```go
func (bs *Service) SubmitJob(ctx context.Context, req *JobRequest) (*JobResponse, error)
```

Submits a job to AWS Batch.

**Parameters:**
- `ctx`: Context for the request
- `req`: Job request containing job details

**Returns:**
- `*JobResponse`: Job response with job ID and name
- `error`: Error if job submission fails

#### GetJobStatus

```go
func (bs *Service) GetJobStatus(ctx context.Context, jobID string) (*batch.JobDetail, error)
```

Retrieves the status and details of a batch job.

**Parameters:**
- `ctx`: Context for the request
- `jobID`: AWS Batch job ID

**Returns:**
- `*batch.JobDetail`: Job details from AWS Batch
- `error`: Error if status retrieval fails

#### CancelJob

```go
func (bs *Service) CancelJob(ctx context.Context, jobID string, reason string) error
```

Cancels a running batch job.

**Parameters:**
- `ctx`: Context for the request
- `jobID`: AWS Batch job ID to cancel
- `reason`: Reason for cancellation

**Returns:**
- `error`: Error if cancellation fails

#### ListJobs

```go
func (bs *Service) ListJobs(ctx context.Context, jobQueue string, jobStatus string) ([]*batch.JobSummary, error)
```

Lists batch jobs in a queue with optional status filtering.

**Parameters:**
- `ctx`: Context for the request
- `jobQueue`: Job queue name
- `jobStatus`: Job status filter (optional, empty string for all)

**Returns:**
- `[]*batch.JobSummary`: List of job summaries
- `error`: Error if listing fails

### Types

#### JobRequest

```go
type JobRequest struct {
    JobName string            // Unique job name
    Command []string          // Command to execute in container
    EnvVars map[string]string // Environment variables
}
```

#### JobResponse

```go
type JobResponse struct {
    JobID   string // AWS Batch job ID
    JobName string // Job name
}
```

## Examples

### Submitting a Simple Job

```go
req := &batch.JobRequest{
    JobName: "hello-world-123",
    Command: []string{"echo", "Hello from batch!"},
    EnvVars: map[string]string{
        "MESSAGE": "Hello from environment",
    },
}

result, err := batchService.SubmitJob(ctx, req)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Job ID: %s\n", result.JobID)
```

### Monitoring Job Status

```go
jobDetail, err := batchService.GetJobStatus(ctx, "job-id-here")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Job Status: %s\n", *jobDetail.Status)

switch *jobDetail.Status {
case "SUBMITTED":
    fmt.Println("Job has been submitted")
case "PENDING":
    fmt.Println("Job is waiting for resources")
case "RUNNABLE":
    fmt.Println("Job is ready to run")
case "RUNNING":
    fmt.Println("Job is currently running")
case "SUCCEEDED":
    fmt.Println("Job completed successfully")
case "FAILED":
    fmt.Println("Job failed")
    if jobDetail.StatusReason != nil {
        fmt.Printf("Reason: %s\n", *jobDetail.StatusReason)
    }
}
```

### Cancelling a Job

```go
err := batchService.CancelJob(ctx, "job-id-here", "User requested cancellation")
if err != nil {
    log.Fatal(err)
}

fmt.Println("Job cancelled successfully")
```

### Listing Jobs

```go
// List all jobs in queue
jobs, err := batchService.ListJobs(ctx, "my-job-queue", "")
if err != nil {
    log.Fatal(err)
}

// List only running jobs
runningJobs, err := batchService.ListJobs(ctx, "my-job-queue", "RUNNING")
if err != nil {
    log.Fatal(err)
}

for _, job := range jobs {
    fmt.Printf("Job: %s, Status: %s\n", *job.JobName, *job.JobStatus)
}
```

## Job Lifecycle

1. **SUBMITTED**: Job has been submitted to the queue
2. **PENDING**: Job is waiting for compute resources
3. **RUNNABLE**: Job is ready to run but waiting to be scheduled
4. **RUNNING**: Job is currently executing
5. **SUCCEEDED**: Job completed successfully
6. **FAILED**: Job failed to complete

## Error Handling

The service provides comprehensive error handling:

```go
result, err := batchService.SubmitJob(ctx, req)
if err != nil {
    // Handle different types of errors
    switch {
    case strings.Contains(err.Error(), "failed to create AWS session"):
        log.Println("AWS configuration error")
    case strings.Contains(err.Error(), "failed to submit batch job"):
        log.Println("Batch submission error")
    default:
        log.Printf("Unknown error: %v", err)
    }
    return
}
```

## AWS Infrastructure Requirements

### Job Definition

Your AWS Batch job definition should be properly configured:

```json
{
    "jobDefinitionName": "my-job-definition",
    "type": "container",
    "containerProperties": {
        "image": "my-container-image:latest",
        "vcpus": 1,
        "memory": 512
    },
    "retryStrategy": {
        "attempts": 3
    }
}
```

### IAM Permissions

Required IAM permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "batch:SubmitJob",
                "batch:DescribeJobs",
                "batch:ListJobs",
                "batch:CancelJob"
            ],
            "Resource": "*"
        }
    ]
}
```

## Best Practices

1. **Use meaningful job names**: Include timestamps or unique identifiers
2. **Set appropriate retry attempts**: Balance between reliability and cost
3. **Monitor job status**: Implement proper monitoring for production workloads
4. **Handle failures gracefully**: Implement proper error handling and logging
5. **Use environment variables**: Pass configuration through environment variables
6. **Clean up resources**: Cancel unnecessary jobs to save costs

## Testing

```go
func TestBatchService(t *testing.T) {
    cfg := &batch.Config{
        AWSRegion:     "us-east-1",
        JobQueue:      "test-queue",
        JobDefinition: "test-job-def",
        JobBaseName:   "test-job",
        RetryAttempts: 1,
    }
    
    service, err := batch.NewService(cfg, logger.New())
    assert.NoError(t, err)
    assert.NotNil(t, service)
}
```

## Integration

This generic batch service can be easily integrated into any application that needs to submit batch jobs. For domain-specific functionality, create wrapper services that use this generic service internally.

Example integration:
```go
// Create a domain-specific service that wraps the generic batch service
type VideoProcessingService struct {
    batchService *batch.Service
    config       *VideoConfig
}

func (vps *VideoProcessingService) ProcessVideo(videoID string) error {
    req := &batch.JobRequest{
        JobName: fmt.Sprintf("video-processing-%s", videoID),
        Command: []string{"process-video", videoID},
        EnvVars: vps.getVideoEnvVars(),
    }
    
    _, err := vps.batchService.SubmitJob(context.Background(), req)
    return err
}
```

## Related Documentation

- [AWS Batch User Guide](https://docs.aws.amazon.com/batch/latest/userguide/)
- [AWS SDK for Go v1 Batch Documentation](https://docs.aws.amazon.com/sdk-for-go/api/service/batch/)
- [AWS Batch API Reference](https://docs.aws.amazon.com/batch/latest/APIReference/)