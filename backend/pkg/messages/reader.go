package messages

import (
	"bytes"
	"errors"
	"fmt"
	"io"
)

type MessageReader interface {
	Next() bool
	Message() Message
	Error() error
}

func NewBatchReader(data []byte) MessageReader {
	return &messageReaderImpl{
		data: data,
	}
}

// messages [type, size, start, end]
type messageReaderImpl struct {
	data    []byte
	curr    int64
	msgType uint64
	msgSize uint64
	msgBody []byte
	version int
	broken  bool
	message Message
	err     error
}

func (m *messageReaderImpl) Next() bool {
	if m.broken {
		m.err = fmt.Errorf("skipping broken batch")
		return false
	}

	// Try to read and decode message type, message size and check range in
	msgType, err := m.ReadUint()
	if err != nil {
		if err != io.EOF {
			m.err = fmt.Errorf("read message type err: %s", err)
		}
		return false
	}
	m.msgType = msgType

	// Read message body (and decode if protocol version less than 1)
	var msg Message
	if m.version > 0 && messageHasSize(msgType) {
		// Read message size if it is a new protocol version
		m.msgSize, err = m.ReadSize()
		if err != nil {
			m.err = fmt.Errorf("read message size err: %s", err)
			return false
		}

		// Try to avoid EOF error
		if len(m.data)-int(m.curr) < int(m.msgSize) {
			m.err = fmt.Errorf("can't read message body")
			return false
		}

		// Dirty hack to avoid extra memory allocation
		// TODO: avoid hack in pre-decoding part
		m.data[m.curr-1] = uint8(m.msgType)
		m.msgBody = m.data[m.curr-1 : m.curr+int64(m.msgSize)]
		m.curr += int64(m.msgSize)

		// Create raw message
		msg = &RawMessage{
			tp:     msgType,
			size:   m.msgSize,
			data:   m.msgBody,
			broken: &m.broken,
		}
		return true
	} else {
		// TODO: rewrite old message decoder to avoid bytes reader
		msg, err = ReadMessage(msgType, bytes.NewReader(m.data[m.curr:]))
		if err != nil {
			if err != io.EOF {
				m.err = fmt.Errorf("read message err: %s", err)
			}
			return false
		}
		msg = transformDeprecated(msg)
	}
	m.message = msg
	return true
}

func (m *messageReaderImpl) Message() Message {
	return m.message
}

func (m *messageReaderImpl) Error() error {
	return m.err
}

func (m *messageReaderImpl) ReadSize() (uint64, error) {
	if len(m.data)-int(m.curr) < 3 {
		return 0, fmt.Errorf("out of range")
	}
	var size uint64
	for i, b := range m.data[m.curr : m.curr+3] {
		size += uint64(b) << (8 * i)
	}
	m.curr += 3
	return size, nil
}

func (m *messageReaderImpl) ReadByte() (byte, error) {
	if int(m.curr) >= len(m.data) {
		return 0, io.EOF
	}
	m.curr++
	return m.data[m.curr-1], nil
}

func (m *messageReaderImpl) ReadUint() (uint64, error) {
	var x uint64
	var s uint
	i := 0
	for {
		b, err := m.ReadByte()
		if err != nil {
			return x, err
		}
		if b < 0x80 {
			if i > 9 || i == 9 && b > 1 {
				return x, errors.New("uint overflow")
			}
			return x | uint64(b)<<s, nil
		}
		x |= uint64(b&0x7f) << s
		s += 7
		i++
	}
}

func (m *messageReaderImpl) ReadInt() (int64, error) {
	ux, err := m.ReadUint()
	x := int64(ux >> 1)
	if err != nil {
		return x, err
	}
	if ux&1 != 0 {
		x = ^x
	}
	return x, err
}

func (m *messageReaderImpl) ReadBoolean() (bool, error) {
	val, err := m.ReadByte()
	if err != nil {
		return false, err
	}
	return val == 1, nil
}

func (m *messageReaderImpl) ReadString() (string, error) {
	l, err := m.ReadUint()
	if err != nil {
		return "", err
	}
	if l > 10e6 {
		return "", errors.New("too long string")
	}
	if len(m.data)-int(m.curr) < int(l) {
		return "", fmt.Errorf("out of range")
	}
	str := string(m.data[m.curr : int(m.curr)+int(l)])
	m.curr += int64(l)
	return str, nil
}
