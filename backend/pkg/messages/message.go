package messages

// BatchInfo represents common information for all messages inside data batch
type BatchInfo struct {
	id        uint64
	topic     string
	timestamp int64
}

func NewBatchMeta(topic string, id uint64, ts int64) *BatchInfo {
	return &BatchInfo{
		id:        id,
		topic:     topic,
		timestamp: ts,
	}
}

func (b *BatchInfo) ID() uint64 {
	return b.id
}

func (b *BatchInfo) Timestamp() int64 {
	return b.timestamp
}

type message struct {
	sessionID uint64
	Timestamp int64
	Index     uint64
	Url       string
	//BatchTime uint64
	batch *BatchInfo
}

func (m *message) Batch() *BatchInfo {
	return m.batch
}

func (m *message) Meta() *message {
	return m
}

func (m *message) SetMeta(origin *message) {
	m.sessionID = origin.sessionID
	m.Timestamp = origin.Timestamp
	m.Index = origin.Index
	m.Url = origin.Url
}

func (m *message) SessionID() uint64 {
	return m.sessionID
}

type Message interface {
	Encode() []byte
	EncodeWithIndex() []byte
	Decode() Message
	TypeID() int
	Meta() *message
	SessionID() uint64
}
