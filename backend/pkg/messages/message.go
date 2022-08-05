package messages

type message struct {
	Timestamp int64
	Index     uint64
}

func (m *message) Meta() *message {
	return m
}

func (m *message) SetMeta(origin *message) {
	m.Timestamp = origin.Timestamp
	m.Index = origin.Index
}

type Message interface {
	Encode() []byte
	EncodeWithIndex() []byte
	Decode() Message
	TypeID() int
	Meta() *message
}
