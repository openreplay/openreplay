package sink

import (
	"bytes"
	"context"
	"encoding/binary"
	"os"
	"time"

	config "openreplay/backend/internal/config/sink"
	"openreplay/backend/internal/sink/assetscache"
	"openreplay/backend/internal/sink/sessionwriter"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/sink"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/storage"
)

type handlerImpl struct {
	cfg                 *config.Config
	log                 logger.Logger
	writer              *sessionwriter.SessionWriter
	producer            types.Producer
	assetMessageHandler *assetscache.AssetsCache
	sinkMetrics         sink.Sink
	counter             *storage.LogCounter
	// Session related vars (TODO: should be reconsidered)
	sessionID    uint64
	messageIndex []byte
	domBuffer    *bytes.Buffer
	devBuffer    *bytes.Buffer
}

type Handler interface {
	Handle(msg messages.Message)
}

func New(cfg *config.Config, log logger.Logger, writer *sessionwriter.SessionWriter, producer types.Producer, assetMessageHandler *assetscache.AssetsCache, metrics sink.Sink, counter *storage.LogCounter) Handler {
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
		domBuffer:           bytes.NewBuffer(make([]byte, 1024)),
		devBuffer:           bytes.NewBuffer(make([]byte, 1024)),
	}
}

func (h *handlerImpl) Handle(msg messages.Message) {
	// Check batchEnd signal (nil message)
	if msg == nil {
		// Skip empty buffers
		if h.domBuffer.Len() <= 0 && h.devBuffer.Len() <= 0 {
			return
		}
		h.sinkMetrics.RecordWrittenBytes(float64(h.domBuffer.Len()), "dom")
		h.sinkMetrics.RecordWrittenBytes(float64(h.devBuffer.Len()), "devtools")

		// Write buffered batches to the session
		if err := h.writer.Write(h.sessionID, h.domBuffer.Bytes(), h.devBuffer.Bytes()); err != nil {
			sessCtx := context.WithValue(context.Background(), "sessionID", h.sessionID)
			h.log.Error(sessCtx, "writer error: %s", err)
		}

		// Prepare buffer for the next batch
		h.domBuffer.Reset()
		h.devBuffer.Reset()
		h.sessionID = 0
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

	// If message timestamp is empty, use at least ts of session start
	ts := msg.Meta().Timestamp
	if ts == 0 {
		h.log.Warn(sessCtx, "zero ts in msgType: %d", msg.TypeID())
	} else {
		// Log ts of last processed message
		h.counter.Update(msg.SessionID(), time.UnixMilli(int64(ts)))
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

	var (
		n   int
		err error
	)

	// Add message to dom buffer
	if messages.IsDOMType(msg.TypeID()) {
		// Write message index
		n, err = h.domBuffer.Write(h.messageIndex)
		if err != nil {
			h.log.Error(sessCtx, "domBuffer index write err: %s", err)
		}
		if n != len(h.messageIndex) {
			h.log.Error(sessCtx, "domBuffer index not full write: %d/%d", n, len(h.messageIndex))
		}
		// Write message body
		n, err = h.domBuffer.Write(msg.Encode())
		if err != nil {
			h.log.Error(sessCtx, "domBuffer message write err: %s", err)
		}
		if n != len(msg.Encode()) {
			h.log.Error(sessCtx, "domBuffer message not full write: %d/%d", n, len(h.messageIndex))
		}
	}

	// Add message to dev buffer
	if !messages.IsDOMType(msg.TypeID()) || msg.TypeID() == messages.MsgTimestamp || msg.TypeID() == messages.MsgTabData {
		// Write message index
		n, err = h.devBuffer.Write(h.messageIndex)
		if err != nil {
			h.log.Error(sessCtx, "devBuffer index write err: %s", err)
		}
		if n != len(h.messageIndex) {
			h.log.Error(sessCtx, "devBuffer index not full write: %d/%d", n, len(h.messageIndex))
		}
		// Write message body
		n, err = h.devBuffer.Write(msg.Encode())
		if err != nil {
			h.log.Error(sessCtx, "devBuffer message write err: %s", err)
		}
		if n != len(msg.Encode()) {
			h.log.Error(sessCtx, "devBuffer message not full write: %d/%d", n, len(h.messageIndex))
		}
	}

	h.sinkMetrics.IncreaseWrittenMessages()
	h.sinkMetrics.RecordMessageSize(float64(len(msg.Encode())))
}
