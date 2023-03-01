package messages

import "fmt"

type Message interface {
	Encode() []byte
	Decode() Message
	TypeID() int
	Meta() *message
	SessionID() uint64
	MsgID() uint64
	Time() uint64
}

// BatchInfo represents common information for all messages inside data batch
type BatchInfo struct {
	sessionID uint64
	id        uint64
	topic     string
	partition uint64
	timestamp int64
	version   uint64
}

func NewBatchInfo(sessID uint64, topic string, id, partition uint64, ts int64) *BatchInfo {
	return &BatchInfo{
		sessionID: sessID,
		id:        id,
		topic:     topic,
		partition: partition,
		timestamp: ts,
	}
}

func (b *BatchInfo) SessionID() uint64 {
	return b.sessionID
}

func (b *BatchInfo) ID() uint64 {
	return b.id
}

func (b *BatchInfo) Timestamp() int64 {
	return b.timestamp
}

func (b *BatchInfo) Info() string {
	return fmt.Sprintf("session: %d, partition: %d, offset: %d, ver: %d", b.sessionID, b.partition, b.id, b.version)
}

type message struct {
	Timestamp uint64
	Index     uint64
	Url       string
	batch     *BatchInfo
}

func (m *message) Batch() *BatchInfo {
	return m.batch
}

func (m *message) Meta() *message {
	return m
}

func (m *message) SetMeta(origin *message) {
	m.batch = origin.batch
	m.Timestamp = origin.Timestamp
	m.Index = origin.Index
	m.Url = origin.Url
}

func (m *message) SessionID() uint64 {
	return m.batch.sessionID
}

func (m *message) MsgID() uint64 {
	return m.Meta().Index
}

func (m *message) Time() uint64 {
	return m.Meta().Timestamp
}

func (m *message) SetSessionID(sessID uint64) {
	if m.batch == nil {
		m.batch = &BatchInfo{}
	}
	m.batch.sessionID = sessID
}
