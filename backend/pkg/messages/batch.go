package messages

import (
	"bytes"
	"fmt"
	"github.com/pkg/errors"
	"io"
	"log"
	"strings"
)

// RawMessage is a not decoded message
type RawMessage struct {
	tp   uint64
	size uint64
	data []byte
	meta *message
}

func (m *RawMessage) Encode() []byte {
	return m.data
}

func (m *RawMessage) TypeID() int {
	return int(m.tp)
}

func (m *RawMessage) Meta() *message {
	return m.meta
}

func WriteSize(size uint64, buf []byte, p int) {
	var m uint64 = 255
	for i := 0; i < 3; i++ {
		buf[p+i] = byte(size & m)
		size = size >> 8
	}
	fmt.Println(buf)
}

func ReadSize(reader io.Reader) (uint64, error) {
	buf := make([]byte, 3)
	n, err := io.ReadFull(reader, buf)
	if err != nil {
		return 0, err
	}
	if n != 3 {
		return 0, fmt.Errorf("read only %d of 3 size bytes", n)
	}
	var size uint64
	for i, b := range buf {
		size += uint64(b) << (8 * i)
	}
	return size, nil
}

func messageHasSize(msgType uint64) bool {
	return !(msgType == 80 || msgType == 81 || msgType == 82)
}

func ReadBatchReader(reader io.Reader, messageHandler func(Message)) error {
	var (
		index     uint64
		timestamp int64
		version   uint64
	)
	log.Println("new batch")

	for {
		// Read message type
		msgType, err := ReadUint(reader)
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return fmt.Errorf("can't read message type: %s", err)
		}
		log.Printf("message type: %d", msgType)

		var msg Message
		if version > 0 && messageHasSize(msgType) {
			// Read message size if it's new protocol version
			msgSize, err := ReadSize(reader)
			if err != nil {
				return fmt.Errorf("can't read message size: %s", err)
			}
			// Read raw message (bytes)
			log.Println("size:", msgSize)
			buf := make([]byte, msgSize)
			_, err = io.ReadFull(reader, buf)
			if err != nil {
				return fmt.Errorf("can't read raw body: %s", err)
			}
			// Create message object
			msg = &RawMessage{
				tp:   msgType,
				size: msgSize,
				data: buf,
				meta: &message{},
			}
			// Temp code
			msg, err = ReadMessage(msgType, bytes.NewReader(buf))
			if err != nil {
				return err
			}
		} else {
			msg, err = ReadMessage(msgType, reader)
			if err == io.EOF {
				return nil
			} else if err != nil {
				if strings.HasPrefix(err.Error(), "Unknown message code:") {
					code := strings.TrimPrefix(err.Error(), "Unknown message code: ")
					msg, err = DecodeExtraMessage(code, reader)
					if err != nil {
						return fmt.Errorf("can't decode msg: %s", err)
					}
				} else {
					return errors.Wrapf(err, "Batch Message decoding error on message with index %v", index)
				}
			}
			msg = transformDeprecated(msg)
		}

		isBatchMeta := false
		switch m := msg.(type) {
		case *BatchMetadata:
			if index != 0 { // Might be several 0-0 BatchMeta in a row without a error though
				return errors.New("Batch Meta found at the end of the batch")
			}
			index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
			timestamp = m.Timestamp
			version = m.Version
			isBatchMeta = true
			log.Printf("new batch version: %d", version)

		case *BatchMeta: // Is not required to be present in batch since IOS doesn't have it (though we might change it)
			if index != 0 { // Might be several 0-0 BatchMeta in a row without a error though
				return errors.New("Batch Meta found at the end of the batch")
			}
			index = m.PageNo<<32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
			timestamp = m.Timestamp
			isBatchMeta = true
			// continue readLoop
		case *IOSBatchMeta:
			if index != 0 { // Might be several 0-0 BatchMeta in a row without a error though
				return errors.New("Batch Meta found at the end of the batch")
			}
			index = m.FirstIndex
			timestamp = int64(m.Timestamp)
			isBatchMeta = true
			// continue readLoop
		case *Timestamp:
			timestamp = int64(m.Timestamp) // TODO(?): replace timestamp type to int64 everywhere (including encoding part in tracker)
			// No skipping here for making it easy to encode back the same sequence of message
			// continue readLoop
		case *SessionStart:
			timestamp = int64(m.Timestamp)
		case *SessionEnd:
			timestamp = int64(m.Timestamp)
		}
		msg.Meta().Index = index
		msg.Meta().Timestamp = timestamp

		messageHandler(msg)
		if !isBatchMeta { // Without that indexes will be unique anyway, though shifted by 1 because BatchMeta is not counted in tracker
			index++
		}
	}
	return errors.New("Error of the codeflow. (Should return on EOF)")
}
