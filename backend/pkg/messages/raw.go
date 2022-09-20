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
	meta    *message
	encoded bool
	skipped *bool
}

func (m *RawMessage) Encode() []byte {
	if m.encoded {
		return m.data
	}
	m.data = make([]byte, m.size+1)
	m.data[0] = uint8(m.tp)
	m.encoded = true
	*m.skipped = false
	_, err := io.ReadFull(m.reader, m.data[1:])
	if err != nil {
		log.Printf("message encode err: %s", err)
		return nil
	}
	return m.data
}

func (m *RawMessage) EncodeWithIndex() []byte {
	if !m.encoded {
		m.Encode()
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
		m.Encode()
	}
	msg, err := ReadMessage(m.tp, bytes.NewReader(m.data[1:]))
	if err != nil {
		log.Printf("decode err: %s", err)
		return nil
	}
	msg.Meta().SetMeta(m.meta)
	return msg
}

func (m *RawMessage) TypeID() int {
	return int(m.tp)
}

func (m *RawMessage) Meta() *message {
	return m.meta
}
