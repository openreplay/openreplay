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

	meta, err := getBatchType(batchData)
	if err != nil {
		b.log.Error(ctx, "failed to read batch meta: %s", err)
		return
	}
	batch.version = meta.batchType
	batch.dataTs = meta.timestamp

	if meta.mobileWriteEnd >= 0 {
		if meta.mobileWriteEnd == 0 {
			// Replay slice is empty (Length == len(MobileBatchMeta)): nothing for the mob file.
			return
		}
		// Raw format (like web player batches): headerV2 + domS/domE routing in MobWriter.
		batch.SetType(PlayerBatch)
		b.batchHandler(batchData[:meta.mobileWriteEnd], batch)
		return
	}

	switch batch.Type() {
	case RawData, FullBatch:
		b.messageIterator.Iterate(batchData, batch)
	case PlayerBatch, AssetsBatch, DevtoolsBatch, AnalyticsBatch:
		b.batchHandler(batchData, batch)
	default:
		b.log.Error(ctx, "unknown batch type: %d, info: %s", meta.batchType, batch.Info())
	}
}

type batchMeta struct {
	batchType      uint64
	timestamp      int64
	mobileWriteEnd int
}

func getBatchType(data []byte) (batchMeta, error) {
	meta := batchMeta{mobileWriteEnd: -1}
	if len(data) == 0 {
		return meta, errors.New("empty batch meta")
	}
	reader := NewBytesReader(data)
	msgType, err := reader.ReadUint()
	if err != nil {
		return meta, fmt.Errorf("failed to read message type: %w", err)
	}
	switch msgType {
	case MsgBatchMetadata:
		msg, err := DecodeBatchMetadata(reader)
		if err != nil {
			return meta, fmt.Errorf("failed to decode web batch metadata: %w", err)
		}
		metadata := msg.(*BatchMetadata)
		meta.batchType = metadata.Version
		meta.timestamp = metadata.Timestamp
		return meta, nil
	case MsgMobileBatchMeta:
		msg, err := DecodeMobileBatchMeta(reader)
		if err != nil {
			return meta, fmt.Errorf("failed to decode mobile batch metadata: %w", err)
		}
		metadata := msg.(*MobileBatchMeta)
		meta.batchType = uint64(FullBatch)
		meta.timestamp = int64(metadata.Timestamp)

		metaLen := int(reader.Pointer())
		length := int(metadata.Length)
		switch {
		case length < metaLen:
			// old tracker: keep mobileWriteEnd == -1, parse every message as before.
		case length == metaLen:
			// new tracker, empty replay slice: nothing to write to the mob file.
			meta.mobileWriteEnd = 0
		case length <= len(data):
			// new tracker: write data[0:length] raw to the mob file.
			meta.mobileWriteEnd = length
		default:
			// fall back to full parse to avoid losing data.
		}
		return meta, nil
	default:
		meta.batchType = uint64(RawData)
		return meta, nil
	}
}
