package messages

import (
	"log"
)

// RawMessage is a not decoded message
type RawMessage struct {
	tp     uint64
	data   []byte
	broken *bool
	meta   *message
}

func (m *RawMessage) Encode() []byte {
	return m.data
}

func (m *RawMessage) Decode() Message {
	msg, err := ReadMessage(m.tp, NewBytesReader(m.data[1:]))
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

func (m *RawMessage) MsgID() uint64 {
	if m.meta != nil {
		return m.meta.Index
	}
	return 0
}

func (m *RawMessage) Time() uint64 {
	if m.meta != nil {
		return m.meta.Timestamp
	}
	return 0
}
