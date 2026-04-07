package messages

import (
	"context"
	"openreplay/backend/pkg/logger"
)

type assetsBatchIteratorImpl struct {
	log             logger.Logger
	batchHandler    BatchHandler
	messageIterator MessageIterator
}

func NewAssetsBatchIterator(log logger.Logger, batchHandler BatchHandler, messageIterator MessageIterator) BatchIterator {
	return &assetsBatchIteratorImpl{
		log:             log,
		batchHandler:    batchHandler,
		messageIterator: messageIterator,
	}
}

func (b *assetsBatchIteratorImpl) Iterate(batchData []byte, batch *BatchInfo) {
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
	case AssetsBatch:
		b.batchHandler(batchData, batch)
	default:
		b.log.Error(ctx, "unknown batch type: %d, info: %s", batchType, batch)
	}
}
