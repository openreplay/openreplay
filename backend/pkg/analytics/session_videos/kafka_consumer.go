package session_videos

import (
	"context"
	"encoding/json"
	"fmt"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

type SessionVideoJobMessage struct {
	Status      string `json:"status"`
	Name        string `json:"name"` // s3Path
	StartOffset int64  `json:"startOffset"`
	Error       string `json:"error,omitempty"`
}

type SessionVideoJobHandler interface {
	HandleJobCompletion(sessionID string, message *SessionVideoJobMessage) error
}

type SessionVideoConsumer struct {
	consumer types.Consumer
	log      logger.Logger
	handler  SessionVideoJobHandler
	ctx      context.Context
	cancel   context.CancelFunc
}

type sessionVideoQueueMessageIterator struct {
	log     logger.Logger
	handler SessionVideoJobHandler
}

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
		return nil, fmt.Errorf("session video processing service is temporarily unavailable")
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

func (svc *SessionVideoConsumer) Start() error {
	svc.log.Info(svc.ctx, "Starting session video consumer with queue infrastructure")
	go svc.consumeLoop()
	return nil
}

func (svc *SessionVideoConsumer) Stop() {
	svc.log.Info(svc.ctx, "Stopping session video consumer")
	svc.cancel()

	if svc.consumer != nil {
		svc.consumer.Close()
	}
}

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

func (svc *SessionVideoConsumer) Commit() error {
	return svc.consumer.Commit()
}

func (svc *SessionVideoConsumer) CommitBack(gap int64) error {
	return svc.consumer.CommitBack(gap)
}

func (svc *SessionVideoConsumer) Rebalanced() <-chan *types.PartitionsRebalancedEvent {
	return svc.consumer.Rebalanced()
}
