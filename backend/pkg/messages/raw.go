package messages

import (
	"bytes"
	"encoding/binary"
	"io"
	"log"
)

// RawMessage is a not decoded message
type RawMessage struct {
	tp      uint64
	size    uint64
	data    []byte
	reader  *bytes.Reader
	raw     []byte
	meta    *message
	encoded bool
	skipped *bool
	broken  *bool
}

func (m *RawMessage) Encode() []byte {
	if m.encoded {
		return m.data
	}
	// Try to avoid EOF error
	if m.reader.Len() < int(m.size) {
		return nil
	}
	// Get current batch position
	currPos, err := m.reader.Seek(0, io.SeekCurrent)
	if err != nil {
		log.Printf("can't get current batch position: %s", err)
		return nil
	}
	// "Move" message type
	if currPos == 0 {
		log.Printf("can't move message type, curr position = %d", currPos)
		return nil
	}
	// Dirty hack to avoid extra memory allocation
	m.raw[currPos-1] = uint8(m.tp)
	m.data = m.raw[currPos-1 : currPos+int64(m.size)]
	m.encoded = true
	return m.data
}

func (m *RawMessage) EncodeWithIndex() []byte {
	if !m.encoded {
		if m.Encode() == nil {
			*m.broken = true
			return nil
		}
	}
	if IsIOSType(int(m.tp)) {
		return m.data
	}
	data := make([]byte, len(m.data)+8)
	copy(data[8:], m.data[:])
	binary.LittleEndian.PutUint64(data[0:], m.Meta().Index)
	return data
}

func (m *RawMessage) Decode() Message {
	if !m.encoded {
		if m.Encode() == nil {
			*m.broken = true
			return nil
		}
	}
	msg, err := ReadMessage(m.tp, bytes.NewReader(m.data[1:]))
	if err != nil {
		log.Printf("decode err: %s", err)
		*m.broken = true
		return nil
	}
	msg = transformDeprecated(msg)
	msg.Meta().SetMeta(m.meta)
	return msg
}

func (m *RawMessage) TypeID() int {
	return int(m.tp)
}

func (m *RawMessage) Meta() *message {
	return m.meta
}

func (m *RawMessage) SessionID() uint64 {
	if m.meta != nil {
		return m.meta.SessionID()
	}
	return 0
}
