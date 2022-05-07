package messages

type message struct {
	Timestamp int64
	Index     uint64
}

func (m *message) Meta() *message {
	return m
}

type Message interface {
	Encode() []byte
	TypeID() int
	Meta() *message
}
