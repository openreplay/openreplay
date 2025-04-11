package messages

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/logger"
)

// MessageHandler processes one message using service logic
type MessageHandler func(Message)

// MessageIterator iterates by all messages in batch
type MessageIterator interface {
	Iterate(batchData []byte, batchInfo *BatchInfo)
}

type messageIteratorImpl struct {
	log         logger.Logger
	filter      map[int]struct{}
	preFilter   map[int]struct{}
	handler     MessageHandler
	autoDecode  bool
	version     uint64
	size        uint64
	canSkip     bool
	broken      bool
	messageInfo *message
	batchInfo   *BatchInfo
	urls        *pageLocations
}

func NewMessageIterator(log logger.Logger, messageHandler MessageHandler, messageFilter []int, autoDecode bool) MessageIterator {
	iter := &messageIteratorImpl{
		log:        log,
		handler:    messageHandler,
		autoDecode: autoDecode,
		urls:       NewPageLocations(),
	}
	if len(messageFilter) != 0 {
		filter := make(map[int]struct{}, len(messageFilter))
		for _, msgType := range messageFilter {
			filter[msgType] = struct{}{}
		}
		iter.filter = filter
	}
	iter.preFilter = map[int]struct{}{
		MsgBatchMetadata: {}, MsgTimestamp: {}, MsgSessionStart: {},
		MsgSessionEnd: {}, MsgSetPageLocation: {}, MsgMobileBatchMeta: {},
	}
	return iter
}

func (i *messageIteratorImpl) prepareVars(batchInfo *BatchInfo) {
	i.batchInfo = batchInfo
	i.messageInfo = &message{batch: batchInfo}
	i.version = 0
	i.canSkip = false
	i.broken = false
	i.size = 0
}

func (i *messageIteratorImpl) Iterate(batchData []byte, batchInfo *BatchInfo) {
	ctx := context.WithValue(context.Background(), "sessionID", batchInfo.sessionID)

	// Create new message reader
	reader := NewMessageReader(batchData)

	// Pre-decode batch data
	if err := reader.Parse(); err != nil {
		i.log.Error(ctx, "pre-decode batch err: %s, info: %s", err, batchInfo.Info())
		return
	}

	// Prepare iterator before processing messages in batch
	i.prepareVars(batchInfo)

	for reader.Next() {
		// Increase message index (can be overwritten by batch info message)
		i.messageInfo.Index++

		msg := reader.Message()
		msgType := msg.TypeID()

		// Preprocess "system" messages
		if _, ok := i.preFilter[msg.TypeID()]; ok {
			msg = msg.Decode()
			if msg == nil {
				i.log.Error(ctx, "decode error, type: %d, info: %s", msgType, i.batchInfo.Info())
				return
			}
			msg = transformDeprecated(msg)
			if err := i.preprocessing(msg); err != nil {
				i.log.Error(ctx, "message preprocessing err: %s", err)
				return
			}
		}

		// Skip messages we don't have in filter
		if i.filter != nil {
			if _, ok := i.filter[msg.TypeID()]; !ok {
				continue
			}
		}

		if i.autoDecode {
			msg = msg.Decode()
			if msg == nil {
				i.log.Error(ctx, "decode error, type: %d, info: %s", msgType, i.batchInfo.Info())
				return
			}
		}

		// Set meta information for message
		msg.Meta().SetMeta(i.messageInfo)

		// Update timestamp value for iOS message types
		if IsMobileType(msgType) {
			msgTime := i.getMobileTimestamp(msg)
			msg.Meta().Timestamp = msgTime
		}

		// Process message
		i.handler(msg)
	}
}

func (i *messageIteratorImpl) getMobileTimestamp(msg Message) uint64 {
	return GetTimestamp(msg)
}

func (i *messageIteratorImpl) zeroTsLog(msgType string) {
	ctx := context.WithValue(context.Background(), "sessionID", i.batchInfo.sessionID)
	i.log.Warn(ctx, "zero timestamp in %s, info: %s", msgType, i.batchInfo.Info())
}

func (i *messageIteratorImpl) preprocessing(msg Message) error {
	switch m := msg.(type) {
	case *BatchMetadata:
		if i.messageInfo.Index > 1 { // Might be several 0-0 BatchMeta in a row without an error though
			return fmt.Errorf("batchMetadata found at the end of the batch, info: %s", i.batchInfo.Info())
		}
		if m.Version > 1 {
			return fmt.Errorf("incorrect batch version: %d, skip current batch, info: %s", i.version, i.batchInfo.Info())
		}
		i.messageInfo.Index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
		i.messageInfo.Timestamp = uint64(m.Timestamp)
		if m.Timestamp == 0 {
			i.zeroTsLog("BatchMetadata")
		}
		i.messageInfo.Url = m.Location
		i.version = m.Version
		i.batchInfo.version = m.Version

	case *Timestamp:
		i.messageInfo.Timestamp = m.Timestamp
		if m.Timestamp == 0 {
			i.zeroTsLog("Timestamp")
		}

	case *SessionStart:
		i.messageInfo.Timestamp = m.Timestamp
		if m.Timestamp == 0 {
			i.zeroTsLog("SessionStart")
			ctx := context.WithValue(context.Background(), "sessionID", i.batchInfo.sessionID)
			i.log.Warn(ctx, "zero timestamp in SessionStart, project: %d, UA: %s, tracker: %s, info: %s",
				m.ProjectID, m.UserAgent, m.TrackerVersion, i.batchInfo.Info())
		}

	case *SessionEnd:
		i.messageInfo.Timestamp = m.Timestamp
		if m.Timestamp == 0 {
			i.zeroTsLog("SessionEnd")
		}
		// Delete session from urls cache layer
		i.urls.Delete(i.messageInfo.batch.sessionID)

	case *SetPageLocation:
		i.messageInfo.Url = m.URL
		// Save session page url in cache for using in next batches
		i.urls.Set(i.messageInfo.batch.sessionID, m.URL)

	case *MobileBatchMeta:
		if i.messageInfo.Index > 1 { // Might be several 0-0 BatchMeta in a row without an error though
			return fmt.Errorf("batchMeta found at the end of the batch, info: %s", i.batchInfo.Info())
		}
		i.messageInfo.Index = m.FirstIndex
		i.messageInfo.Timestamp = m.Timestamp
		if m.Timestamp == 0 {
			i.zeroTsLog("MobileBatchMeta")
		}
	}
	return nil
}

func messageHasSize(msgType uint64) bool {
	return !(msgType == 80 || msgType == 81 || msgType == 82)
}
