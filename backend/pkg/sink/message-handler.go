package sink

import (
	"bytes"
	"context"
	"encoding/binary"
	config "openreplay/backend/internal/config/sink"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/sessionwriter"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/sink"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
	"os"
)

type handlerImpl struct {
	cfg                 *config.Config
	log                 logger.Logger
	writer              *sessionwriter.MobWriter
	producer            types.Producer
	assetMessageHandler *assetscache.AssetsCache
	sinkMetrics         sink.Sink
	counter             *storage.LogCounter
	batchInfo           *messages.BatchInfo
	sessionID           uint64
	messageIndex        []byte
	domBuffer           *bytes.Buffer
	devBuffer           *bytes.Buffer
}

type Handler interface {
	Handle(msg messages.Message)
}

func New(cfg *config.Config, log logger.Logger, writer *sessionwriter.MobWriter, producer types.Producer, assetMessageHandler *assetscache.AssetsCache, metrics sink.Sink, counter *storage.LogCounter) Handler {
	if _, err := os.Stat(cfg.FsDir); os.IsNotExist(err) {
		log.Fatal(context.Background(), "%v doesn't exist. %v", cfg.FsDir, err)
	}
	return &handlerImpl{
		cfg:                 cfg,
		log:                 log,
		writer:              writer,
		producer:            producer,
		assetMessageHandler: assetMessageHandler,
		sinkMetrics:         metrics,
		counter:             counter,
		messageIndex:        make([]byte, 8),
		domBuffer:           bytes.NewBuffer(make([]byte, 0, 1024)),
		devBuffer:           bytes.NewBuffer(make([]byte, 0, 1024)),
	}
}

func (h *handlerImpl) Handle(msg messages.Message) {
	// Check batchEnd signal (nil message)
	if msg == nil {
		if h.domBuffer.Len() > 0 {
			h.sinkMetrics.RecordWrittenBytes(float64(h.domBuffer.Len()), "dom")
			h.writer.HandleBatch(h.domBuffer.Bytes(), h.batchInfo)
		}
		if h.devBuffer.Len() > 0 {
			h.sinkMetrics.RecordWrittenBytes(float64(h.devBuffer.Len()), "devtools")
			h.batchInfo.SetType(messages.DevtoolsBatch)
			h.writer.HandleBatch(h.devBuffer.Bytes(), h.batchInfo)
		}

		// Prepare buffer for the next batch
		h.domBuffer.Reset()
		h.devBuffer.Reset()
		h.sessionID = 0
		h.batchInfo = nil
		return
	}

	h.sinkMetrics.IncreaseTotalMessages()
	sessCtx := context.WithValue(context.Background(), "sessionID", msg.SessionID())

	// Send SessionEnd trigger to storage service
	if msg.TypeID() == messages.MsgSessionEnd || msg.TypeID() == messages.MsgMobileSessionEnd {
		if err := h.producer.Produce(h.cfg.TopicTrigger, msg.SessionID(), msg.Encode()); err != nil {
			h.log.Error(sessCtx, "can't send SessionEnd to trigger topic: %s", err)
		}
		// duplicate session end message to mobile trigger topic to build video replay for mobile sessions
		if msg.TypeID() == messages.MsgMobileSessionEnd {
			if err := h.producer.Produce(h.cfg.TopicMobileTrigger, msg.SessionID(), msg.Encode()); err != nil {
				h.log.Error(sessCtx, "can't send MobileSessionEnd to mobile trigger topic: %s", err)
			}
		}
		h.writer.Close(msg.SessionID())
		return
	}

	// Process assets
	if msg.TypeID() == messages.MsgSetNodeAttributeURLBased ||
		msg.TypeID() == messages.MsgSetCSSDataURLBased ||
		msg.TypeID() == messages.MsgAdoptedSSReplaceURLBased ||
		msg.TypeID() == messages.MsgAdoptedSSInsertRuleURLBased {
		m := msg.Decode()
		if m == nil {
			h.log.Error(sessCtx, "assets decode err, info: %s", msg.Meta().Batch().Info())
			return
		}
		msg = h.assetMessageHandler.ParseAssets(m)
	}

	// Filter message
	if !messages.IsReplayerType(msg.TypeID()) {
		return
	}

	if h.batchInfo == nil {
		h.batchInfo = msg.Meta().Batch()
	}

	// Try to encode message to avoid null data inserts
	data := msg.Encode()
	if data == nil {
		return
	}

	// Write message to the batch buffer
	if h.sessionID == 0 {
		h.sessionID = msg.SessionID()
	}

	// Encode message index
	binary.LittleEndian.PutUint64(h.messageIndex, msg.Meta().Index)

	// Add message to dom buffer
	if messages.IsDOMType(msg.TypeID()) {
		h.domBuffer.Write(h.messageIndex)
		h.domBuffer.Write(data)
	}

	// Add message to dev buffer
	if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp || msg.TypeID() == messages.MsgTabData {
		h.devBuffer.Write(h.messageIndex)
		h.devBuffer.Write(data)
	}

	h.sinkMetrics.IncreaseWrittenMessages()
	h.sinkMetrics.RecordMessageSize(float64(len(data)))
}
