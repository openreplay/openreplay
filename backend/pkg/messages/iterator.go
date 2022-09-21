package messages

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"strings"
)

// MessageHandler processes one message using service logic
type MessageHandler func(Message)

type MessageIterator interface {
	Iterate(sessionID uint64, data []byte, meta *BatchInfo)
}

type messageIteratorImpl struct {
	filter    map[int]struct{}
	handler   MessageHandler
	index     uint64
	version   uint64
	size      uint64
	canSkip   bool
	url       string
	timestamp int64
	currBatch *BatchInfo
}

func NewMessageIterator(messageFilter []int, messageHandler MessageHandler) MessageIterator {
	iter := &messageIteratorImpl{handler: messageHandler}
	if len(messageFilter) != 0 {
		filter := make(map[int]struct{}, len(messageFilter))
		for _, msgType := range messageFilter {
			filter[msgType] = struct{}{}
		}
		iter.filter = filter
	}
	return iter
}

func (i *messageIteratorImpl) clearVars() {
	i.index = 0
	i.version = 0
	i.canSkip = false
	i.url = ""
	i.timestamp = 0
	i.size = 0
}

func (i *messageIteratorImpl) Iterate(sessionID uint64, data []byte, meta *BatchInfo) {
	i.clearVars()
	i.currBatch = meta
	reader := bytes.NewReader(data)
	for {
		if i.canSkip {
			if _, err := reader.Seek(int64(i.size), io.SeekCurrent); err != nil {
				log.Printf("seek err: %s", err)
				return
			}
		}
		i.canSkip = false

		// Read message type
		msgType, err := ReadUint(reader)
		if err != nil {
			if err != io.EOF {
				log.Printf("can't read message type: %s", err)
			}
			return
		}
		var msg Message
		// Read message body (and decode if protocol version less than 1)
		if i.version > 0 && messageHasSize(msgType) {
			// Read message size if it is a new protocol version
			i.size, err = ReadSize(reader)
			if err != nil {
				log.Printf("can't read message size: %s", err)
				return
			}
			msg = &RawMessage{
				tp:      msgType,
				size:    i.size,
				meta:    &message{},
				reader:  reader,
				skipped: &i.canSkip,
			}
			i.canSkip = true
		} else {
			msg, err = ReadMessage(msgType, reader)
			if err == io.EOF {
				return
			} else if err != nil {
				if strings.HasPrefix(err.Error(), "Unknown message code:") {
					code := strings.TrimPrefix(err.Error(), "Unknown message code: ")
					msg, err = DecodeExtraMessage(code, reader)
					if err != nil {
						log.Printf("can't decode msg: %s", err)
						return
					}
				} else {
					log.Printf("Batch Message decoding error on message with index %v, err: %s", i.index, err)
					return
				}
			}
			msg = transformDeprecated(msg)
		}
		if err := i.preprocessing(msg); err != nil {
			log.Printf("message preprocessing err: %s", err)
			return
		}
	}
}

func (i *messageIteratorImpl) preprocessing(msg Message) error {
	// Process meta information
	isBatchMeta := false
	switch msg.TypeID() {
	case MsgBatchMetadata:
		if i.index != 0 { // Might be several 0-0 BatchMeta in a row without an error though
			return fmt.Errorf("batchMetadata found at the end of the batch")
		}
		msg := msg.Decode()
		if msg == nil {
			return fmt.Errorf("can't decode message")
		}
		m := msg.(*BatchMetadata)
		i.index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
		i.timestamp = m.Timestamp
		i.version = m.Version
		i.url = m.Url
		isBatchMeta = true
		if i.version > 1 {
			return fmt.Errorf("incorrect batch version: %d, skip current batch", i.version)
		}
	case MsgBatchMeta: // Is not required to be present in batch since IOS doesn't have it (though we might change it)
		if i.index != 0 { // Might be several 0-0 BatchMeta in a row without an error though
			return fmt.Errorf("batchMeta found at the end of the batch")
		}
		msg := msg.Decode()
		if msg == nil {
			return fmt.Errorf("can't decode message")
		}
		m := msg.(*BatchMeta)
		i.index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
		i.timestamp = m.Timestamp
		isBatchMeta = true
		// continue readLoop
	case MsgIOSBatchMeta:
		if i.index != 0 { // Might be several 0-0 BatchMeta in a row without an error though
			return fmt.Errorf("iOS batchMeta found at the end of the batch")
		}
		msg := msg.Decode()
		if msg == nil {
			return fmt.Errorf("can't decode message")
		}
		m := msg.(*IOSBatchMeta)
		i.index = m.FirstIndex
		i.timestamp = int64(m.Timestamp)
		isBatchMeta = true
		// continue readLoop
	case MsgTimestamp:
		msg := msg.Decode()
		if msg == nil {
			return fmt.Errorf("can't decode message")
		}
		m := msg.(*Timestamp)
		i.timestamp = int64(m.Timestamp)
		// No skipping here for making it easy to encode back the same sequence of message
		// continue readLoop
	case MsgSessionStart:
		msg := msg.Decode()
		if msg == nil {
			return fmt.Errorf("can't decode message")
		}
		m := msg.(*SessionStart)
		i.timestamp = int64(m.Timestamp)
	case MsgSessionEnd:
		msg := msg.Decode()
		if msg == nil {
			return fmt.Errorf("can't decode message")
		}
		m := msg.(*SessionEnd)
		i.timestamp = int64(m.Timestamp)
	case MsgSetPageLocation:
		msg := msg.Decode()
		if msg == nil {
			return fmt.Errorf("can't decode message")
		}
		m := msg.(*SetPageLocation)
		i.url = m.URL
	}
	msg.Meta().Index = i.index
	msg.Meta().Timestamp = i.timestamp
	msg.Meta().Url = i.url
	msg.Meta().batch = i.currBatch

	if !isBatchMeta { // Without that indexes will be unique anyway, though shifted by 1 because BatchMeta is not counted in tracker
		i.index++
	}

	// Filter message
	if i.filter != nil {
		if _, ok := i.filter[msg.TypeID()]; ok {
			return nil
		}
	}

	// Process message
	i.handler(msg)
	return nil
}
