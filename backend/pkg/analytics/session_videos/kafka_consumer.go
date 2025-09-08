package session_videos

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

// SessionVideoJobMessage represents the Kafka message structure
type SessionVideoJobMessage struct {
	Status      string `json:"status"`
	Name        string `json:"name"` // s3Path
	StartOffset int64  `json:"startOffset"`
	Error       string `json:"error,omitempty"`
	Screenshots int    `json:"screenshots"`
}

// SessionVideoJobHandler defines the interface for handling job completion messages
type SessionVideoJobHandler interface {
	HandleJobCompletion(sessionID string, message *SessionVideoJobMessage) error
}

// SessionVideoConsumer handles Kafka messages for session video job completion using OpenReplay queue infrastructure
type SessionVideoConsumer struct {
	consumer types.Consumer
	log      logger.Logger
	handler  SessionVideoJobHandler
	ctx      context.Context
	cancel   context.CancelFunc
}

// sessionVideoQueueMessageIterator implements the MessageIterator interface for session video messages
type sessionVideoQueueMessageIterator struct {
	log     logger.Logger
	handler SessionVideoJobHandler
}

// Iterate processes session video job messages from the queue
func (iter *sessionVideoQueueMessageIterator) Iterate(batchData []byte, batchInfo *messages.BatchInfo) {
	ctx := context.WithValue(context.Background(), "sessionID", batchInfo.SessionID)

	var jobMessage SessionVideoJobMessage
	if err := json.Unmarshal(batchData, &jobMessage); err != nil {
		iter.log.Error(ctx, "Failed to unmarshal session video job message", "error", err, "sessionID", batchInfo.SessionID)
		return
	}

	sessionID := fmt.Sprintf("%d", batchInfo.SessionID())

	iter.log.Info(ctx, "Processing session video job completion",
		"sessionID", sessionID,
		"status", jobMessage.Status,
		"s3Path", jobMessage.Name,
		"screenshots", jobMessage.Screenshots,
		"batchInfo", batchInfo.Info())

	if err := iter.handler.HandleJobCompletion(sessionID, &jobMessage); err != nil {
		iter.log.Error(ctx, "Failed to handle job completion",
			"error", err,
			"sessionID", sessionID,
			"status", jobMessage.Status)
		return
	}

	iter.log.Debug(ctx, "Successfully processed session video job completion", "sessionID", sessionID)
}

// NewSessionVideoConsumer creates a new consumer using OpenReplay queue infrastructure
func NewSessionVideoConsumer(groupID string, topics []string, handler SessionVideoJobHandler, log logger.Logger) (*SessionVideoConsumer, error) {
	messageIterator := &sessionVideoQueueMessageIterator{
		log:     log,
		handler: handler,
	}

	consumer := queue.NewConsumer(
		groupID,
		topics,
		messageIterator,
		false,     // autoCommit = false for manual control
		1024*1024, // messageSizeLimit = 1MB
	)

	if consumer == nil {
		return nil, fmt.Errorf("failed to create session video consumer using queue infrastructure")
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &SessionVideoConsumer{
		consumer: consumer,
		log:      log,
		handler:  handler,
		ctx:      ctx,
		cancel:   cancel,
	}, nil
}

// Start begins consuming messages using OpenReplay queue infrastructure
func (svc *SessionVideoConsumer) Start() error {
	svc.log.Info(svc.ctx, "Starting session video consumer with queue infrastructure")
	go svc.consumeLoop()
	return nil
}

// Stop gracefully stops the consumer
func (svc *SessionVideoConsumer) Stop() {
	svc.log.Info(svc.ctx, "Stopping session video consumer")
	svc.cancel()

	if svc.consumer != nil {
		svc.consumer.Close()
	}
}

// consumeLoop is the main consumer loop
func (svc *SessionVideoConsumer) consumeLoop() {
	for {
		select {
		case <-svc.ctx.Done():
			svc.log.Info(svc.ctx, "Session video consumer loop stopped")
			return
		default:
			if err := svc.consumer.ConsumeNext(); err != nil {
				svc.log.Error(svc.ctx, "Error consuming message", "error", err)
			}
		}
	}
}

// Commit commits the current offset
func (svc *SessionVideoConsumer) Commit() error {
	return svc.consumer.Commit()
}

// CommitBack commits messages up to a certain gap
func (svc *SessionVideoConsumer) CommitBack(gap int64) error {
	return svc.consumer.CommitBack(gap)
}

// Rebalanced returns the rebalance event channel
func (svc *SessionVideoConsumer) Rebalanced() <-chan *types.PartitionsRebalancedEvent {
	return svc.consumer.Rebalanced()
}

// hashSessionIDToUint64 creates a consistent hash from the session ID string for use as uint64 key
func hashSessionIDToUint64(sessionID string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(sessionID))
	hash := h.Sum64()

	if hash == 0 {
		hash = 1
	}

	return hash
}

// decodeBase64SessionID decodes a base64-encoded session ID
func decodeBase64SessionID(encodedSessionID string) (string, error) {
	decoded, err := base64.StdEncoding.DecodeString(encodedSessionID)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64 session ID: %w", err)
	}
	return string(decoded), nil
}
