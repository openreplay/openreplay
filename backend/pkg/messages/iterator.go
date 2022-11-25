package messages

import (
	"bytes"
	"fmt"
	"io"
	"log"
)

// MessageHandler processes one message using service logic
type MessageHandler func(Message)

// MessageIterator iterates by all messages in batch
type MessageIterator interface {
	Iterate(batchData []byte, batchInfo *BatchInfo)
}

type messageIteratorImpl struct {
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
}

func NewMessageIterator(messageHandler MessageHandler, messageFilter []int, autoDecode bool) MessageIterator {
	iter := &messageIteratorImpl{handler: messageHandler, autoDecode: autoDecode}
	if len(messageFilter) != 0 {
		filter := make(map[int]struct{}, len(messageFilter))
		for _, msgType := range messageFilter {
			filter[msgType] = struct{}{}
		}
		iter.filter = filter
	}
	iter.preFilter = map[int]struct{}{
		MsgBatchMetadata: {}, MsgBatchMeta: {}, MsgTimestamp: {},
		MsgSessionStart: {}, MsgSessionEnd: {}, MsgSetPageLocation: {},
		MsgSessionEndDeprecated: {}}
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
	// Prepare iterator before processing messages in batch
	i.prepareVars(batchInfo)

	// Initialize batch reader
	reader := bytes.NewReader(batchData)

	// Process until end of batch or parsing error
	for {
		// Increase message index (can be overwritten by batch info message)
		i.messageInfo.Index++

		if i.broken {
			log.Printf("skipping broken batch, info: %s", i.batchInfo.Info())
			return
		}

		if i.canSkip {
			if _, err := reader.Seek(int64(i.size), io.SeekCurrent); err != nil {
				log.Printf("can't skip message: %s, info: %s", err, i.batchInfo.Info())
				return
			}
		}
		i.canSkip = false

		// Read message type
		msgType, err := ReadUint(reader)
		if err != nil {
			if err != io.EOF {
				log.Printf("can't read message type: %s, info: %s", err, i.batchInfo.Info())
			}
			return
		}

		var msg Message
		// Read message body (and decode if protocol version less than 1)
		if i.version > 0 && messageHasSize(msgType) {
			// Read message size if it is a new protocol version
			i.size, err = ReadSize(reader)
			if err != nil {
				log.Printf("can't read message size: %s, info: %s", err, i.batchInfo.Info())
				return
			}
			msg = &RawMessage{
				tp:      msgType,
				size:    i.size,
				reader:  reader,
				raw:     batchData,
				skipped: &i.canSkip,
				broken:  &i.broken,
				meta:    i.messageInfo,
			}
			i.canSkip = true
		} else {
			msg, err = ReadMessage(msgType, reader)
			if err != nil {
				if err != io.EOF {
					log.Printf("can't read message body: %s, info: %s", err, i.batchInfo.Info())
				}
				return
			}
			msg = transformDeprecated(msg)
		}

		// Preprocess "system" messages
		if _, ok := i.preFilter[msg.TypeID()]; ok {
			msg = msg.Decode()
			if msg == nil {
				log.Printf("decode error, type: %d, info: %s", msgType, i.batchInfo.Info())
				return
			}
			if err := i.preprocessing(msg); err != nil {
				log.Printf("message preprocessing err: %s", err)
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
				log.Printf("decode error, type: %d, info: %s", msgType, i.batchInfo.Info())
				return
			}
		}

		// Set meta information for message
		msg.Meta().SetMeta(i.messageInfo)

		// Process message
		i.handler(msg)
	}
}

func (i *messageIteratorImpl) zeroTsLog(msgType string) {
	log.Printf("zero timestamp in %s, info: %s", msgType, i.batchInfo.Info())
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
		i.messageInfo.Timestamp = m.Timestamp
		if m.Timestamp == 0 {
			i.zeroTsLog("BatchMetadata")
		}
		i.messageInfo.Url = m.Url
		i.version = m.Version
		i.batchInfo.version = m.Version

	case *BatchMeta: // Is not required to be present in batch since IOS doesn't have it (though we might change it)
		if i.messageInfo.Index > 1 { // Might be several 0-0 BatchMeta in a row without an error though
			return fmt.Errorf("batchMeta found at the end of the batch, info: %s", i.batchInfo.Info())
		}
		i.messageInfo.Index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
		i.messageInfo.Timestamp = m.Timestamp
		if m.Timestamp == 0 {
			i.zeroTsLog("BatchMeta")
		}

	case *Timestamp:
		i.messageInfo.Timestamp = int64(m.Timestamp)
		if m.Timestamp == 0 {
			i.zeroTsLog("Timestamp")
		}

	case *SessionStart:
		i.messageInfo.Timestamp = int64(m.Timestamp)
		if m.Timestamp == 0 {
			i.zeroTsLog("SessionStart")
			log.Printf("zero session start, project: %d, UA: %s, tracker: %s, info: %s",
				m.ProjectID, m.UserAgent, m.TrackerVersion, i.batchInfo.Info())
		}

	case *SessionEnd:
		i.messageInfo.Timestamp = int64(m.Timestamp)
		if m.Timestamp == 0 {
			i.zeroTsLog("SessionEnd")
		}

	case *SetPageLocation:
		i.messageInfo.Url = m.URL
	}
	return nil
}

func messageHasSize(msgType uint64) bool {
	return !(msgType == 80 || msgType == 81 || msgType == 82)
}
