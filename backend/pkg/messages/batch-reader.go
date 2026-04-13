package messages

import (
	"context"
	"errors"
	"fmt"

	"openreplay/backend/pkg/logger"
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

func (b *batchIteratorImpl) Iterate(batchData []byte, batch *BatchInfo) {
	ctx := context.WithValue(context.Background(), "sessionID", batch.sessionID)

	batchType, batchTimestamp, err := getBatchType(batchData)
	if err != nil {
		b.log.Error(ctx, "failed to read batch meta: %s", err)
		return
	}
	batch.version = batchType
	batch.dataTs = batchTimestamp

	switch batch.Type() {
	case RawData, FullBatch:
		b.messageIterator.Iterate(batchData, batch)
	case PlayerBatch, AssetsBatch, DevtoolsBatch, AnalyticsBatch:
		b.batchHandler(batchData, batch)
	default:
		b.log.Error(ctx, "unknown batch type: %d, info: %s", batchType, batch)
	}
}

func getBatchType(data []byte) (uint64, int64, error) {
	if len(data) == 0 {
		return 0, 0, errors.New("empty batch meta")
	}
	reader := NewBytesReader(data)
	msgType, err := reader.ReadUint()
	if err != nil {
		return 0, 0, fmt.Errorf("failed to read message type: %w", err)
	}
	if msgType != MsgBatchMetadata {
		return uint64(RawData), 0, nil
	}
	msg, err := DecodeBatchMetadata(reader)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to decode batch metadata: %w", err)
	}
	metadata := msg.(*BatchMetadata)
	return metadata.Version, metadata.Timestamp, nil
}
