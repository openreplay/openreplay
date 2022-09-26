package messages

type Message interface {
	Encode() []byte
	EncodeWithIndex() []byte
	Decode() Message
	TypeID() int
	Meta() *message
	SessionID() uint64
}

// BatchInfo represents common information for all messages inside data batch
type BatchInfo struct {
	sessionID uint64
	id        uint64
	topic     string
	timestamp int64
}

func NewBatchInfo(sessID uint64, topic string, id uint64, ts int64) *BatchInfo {
	return &BatchInfo{
		sessionID: sessID,
		id:        id,
		topic:     topic,
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

type message struct {
	Timestamp int64
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

func (m *message) SetSessionID(sessID uint64) {
	m.batch.sessionID = sessID
}
