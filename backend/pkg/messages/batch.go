package messages

import (
	"bytes"
	"io"
	"log"
	"strings"
)

type Iterator interface {
	Next() bool       // Return true if we have next message
	Type() int        // Return type of the next message
	Message() Message // Return raw or decoded message
	Close()
}

type iteratorImpl struct {
	data      *bytes.Reader
	index     uint64
	timestamp int64
	version   uint64
	msgType   uint64
	msgSize   uint64
	canSkip   bool
	msg       Message
	url       string
}

func NewIterator(data []byte) Iterator {
	return &iteratorImpl{
		data: bytes.NewReader(data),
	}
}

func (i *iteratorImpl) Next() bool {
	if i.canSkip {
		if _, err := i.data.Seek(int64(i.msgSize), io.SeekCurrent); err != nil {
			log.Printf("seek err: %s", err)
			return false
		}
	}
	i.canSkip = false

	var err error
	i.msgType, err = ReadUint(i.data)
	if err != nil {
		if err == io.EOF {
			return false
		}
		log.Printf("can't read message type: %s", err)
		return false
	}

	if i.version > 0 && messageHasSize(i.msgType) {
		// Read message size if it is a new protocol version
		i.msgSize, err = ReadSize(i.data)
		if err != nil {
			log.Printf("can't read message size: %s", err)
			return false
		}
		i.msg = &RawMessage{
			tp:      i.msgType,
			size:    i.msgSize,
			meta:    &message{},
			reader:  i.data,
			skipped: &i.canSkip,
		}
		i.canSkip = true
	} else {
		i.msg, err = ReadMessage(i.msgType, i.data)
		if err == io.EOF {
			return false
		} else if err != nil {
			if strings.HasPrefix(err.Error(), "Unknown message code:") {
				code := strings.TrimPrefix(err.Error(), "Unknown message code: ")
				i.msg, err = DecodeExtraMessage(code, i.data)
				if err != nil {
					log.Printf("can't decode msg: %s", err)
					return false
				}
			} else {
				log.Printf("Batch Message decoding error on message with index %v, err: %s", i.index, err)
				return false
			}
		}
		i.msg = transformDeprecated(i.msg)
	}

	// Process meta information
	isBatchMeta := false
	switch i.msgType {
	case MsgBatchMetadata:
		if i.index != 0 { // Might be several 0-0 BatchMeta in a row without an error though
			log.Printf("Batch Metadata found at the end of the batch")
			return false
		}
		msg := i.msg.Decode()
		if msg == nil {
			return false
		}
		m := msg.(*BatchMetadata)
		i.index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
		i.timestamp = m.Timestamp
		i.version = m.Version
		i.url = m.Url
		isBatchMeta = true
		if i.version > 1 {
			log.Printf("incorrect batch version, skip current batch")
			return false
		}
	case MsgBatchMeta: // Is not required to be present in batch since IOS doesn't have it (though we might change it)
		if i.index != 0 { // Might be several 0-0 BatchMeta in a row without an error though
			log.Printf("Batch Meta found at the end of the batch")
			return false
		}
		msg := i.msg.Decode()
		if msg == nil {
			return false
		}
		m := msg.(*BatchMeta)
		i.index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
		i.timestamp = m.Timestamp
		isBatchMeta = true
		// continue readLoop
	case MsgIOSBatchMeta:
		if i.index != 0 { // Might be several 0-0 BatchMeta in a row without an error though
			log.Printf("Batch Meta found at the end of the batch")
			return false
		}
		msg := i.msg.Decode()
		if msg == nil {
			return false
		}
		m := msg.(*IOSBatchMeta)
		i.index = m.FirstIndex
		i.timestamp = int64(m.Timestamp)
		isBatchMeta = true
		// continue readLoop
	case MsgTimestamp:
		msg := i.msg.Decode()
		if msg == nil {
			return false
		}
		m := msg.(*Timestamp)
		i.timestamp = int64(m.Timestamp)
		// No skipping here for making it easy to encode back the same sequence of message
		// continue readLoop
	case MsgSessionStart:
		msg := i.msg.Decode()
		if msg == nil {
			return false
		}
		m := msg.(*SessionStart)
		i.timestamp = int64(m.Timestamp)
	case MsgSessionEnd:
		msg := i.msg.Decode()
		if msg == nil {
			return false
		}
		m := msg.(*SessionEnd)
		i.timestamp = int64(m.Timestamp)
	case MsgSetPageLocation:
		msg := i.msg.Decode()
		if msg == nil {
			return false
		}
		m := msg.(*SetPageLocation)
		i.url = m.URL
	}
	i.msg.Meta().Index = i.index
	i.msg.Meta().Timestamp = i.timestamp
	i.msg.Meta().Url = i.url

	if !isBatchMeta { // Without that indexes will be unique anyway, though shifted by 1 because BatchMeta is not counted in tracker
		i.index++
	}
	return true
}

func (i *iteratorImpl) Type() int {
	return int(i.msgType)
}

func (i *iteratorImpl) Message() Message {
	return i.msg
}

func (i *iteratorImpl) Close() {
	_, err := i.data.Seek(0, io.SeekEnd)
	if err != nil {
		log.Printf("can't set seek pointer at the end: %s", err)
	}
}

func messageHasSize(msgType uint64) bool {
	return !(msgType == 80 || msgType == 81 || msgType == 82)
}
