package messages

import (
	"context"
	"errors"
	"fmt"

	"openreplay/backend/pkg/logger"
)

type BatchType uint64

const (
	RawData BatchType = iota
	FullBatch
	PlayerBatch
	AssetsBatch
	DevtoolsBatch
	AnalyticsBatch
)

type BatchHandler func([]byte, *BatchInfo)

type batchIteratorImpl struct {
	log             logger.Logger
	batchHandler    BatchHandler
	messageIterator MessageIterator
}

type BatchIterator interface {
	Iterate(batchData []byte, batchInfo *BatchInfo)
}

func NewBatchIterator(log logger.Logger, batchHandler BatchHandler, messageIterator MessageIterator) BatchIterator {
	return &batchIteratorImpl{
		log:             log,
		batchHandler:    batchHandler,
		messageIterator: messageIterator,
	}
}

func (b *batchIteratorImpl) Iterate(batchData []byte, batchInfo *BatchInfo) {
	ctx := context.WithValue(context.Background(), "sessionID", batchInfo.sessionID)

	batchType, err := getBatchType(batchData)
	if err != nil {
		b.log.Error(ctx, "failed to read batch meta: %s", err)
		return
	}

	switch batchType {
	case RawData, FullBatch:
		b.messageIterator.Iterate(batchData, batchInfo)
	case PlayerBatch, AssetsBatch, DevtoolsBatch, AnalyticsBatch:
		batchInfo.version = uint64(batchType)
		b.batchHandler(batchData, batchInfo)
	default:
		b.log.Error(ctx, "unknown batch type: %d, info: %s", batchType,
			batchInfo.Info())
	}
}

func getBatchType(data []byte) (BatchType, error) {
	if len(data) == 0 {
		return 0, errors.New("empty batch meta")
	}
	reader := NewBytesReader(data)
	msgType, err := reader.ReadUint()
	if err != nil {
		return 0, fmt.Errorf("failed to read message type: %w", err)
	}
	if msgType != MsgBatchMetadata {
		return RawData, nil
	}
	msg, err := DecodeBatchMetadata(reader)
	if err != nil {
		return 0, fmt.Errorf("failed to decode batch metadata: %w", err)
	}
	return BatchType(msg.(*BatchMetadata).Version), nil
}
