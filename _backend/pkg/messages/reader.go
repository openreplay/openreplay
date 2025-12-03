package messages

import (
	"fmt"
	"io"
)

type MessageReader interface {
	Parse() (err error)
	Next() bool
	Message() Message
}

func NewMessageReader(data []byte) MessageReader {
	return &messageReaderImpl{
		data:   data,
		reader: NewBytesReader(data),
		list:   make([]*MessageMeta, 0, 1024),
	}
}

type MessageMeta struct {
	msgType uint64
	msgSize uint64
	msgFrom uint64
}

type messageReaderImpl struct {
	data    []byte
	reader  BytesReader
	msgType uint64
	msgSize uint64
	msgBody []byte
	version int
	broken  bool
	message Message
	err     error
	list    []*MessageMeta
	listPtr int
}

func (m *messageReaderImpl) Parse() (err error) {
	m.listPtr = 0
	m.list = m.list[:0]
	m.broken = false
	for {
		// Try to read and decode message type, message size and check range in
		m.msgType, err = m.reader.ReadUint()
		if err != nil {
			if err != io.EOF {
				return fmt.Errorf("read message type err: %s", err)
			}
			// Reached the end of batch
			return nil
		}

		// Read message body (and decode if protocol version less than 1)
		if m.version > 0 && messageHasSize(m.msgType) {
			// Read message size if it is a new protocol version
			m.msgSize, err = m.reader.ReadSize()
			if err != nil {
				return fmt.Errorf("read message size err: %s", err)
			}

			// Try to avoid EOF error

			curr := m.reader.Pointer()
			if len(m.data)-int(curr) < int(m.msgSize) {
				return fmt.Errorf("can't read message body")
			}

			// Dirty hack to avoid extra memory allocation
			mTypeByteSize := ByteSizeUint(m.msgType)
			from := int(curr) - mTypeByteSize
			WriteUint(m.msgType, m.data, from)

			// Add message meta to list
			m.list = append(m.list, &MessageMeta{
				msgType: m.msgType,
				msgSize: m.msgSize + 1,
				msgFrom: uint64(from),
			})

			// Update data pointer
			m.reader.SetPointer(curr + int64(m.msgSize))
		} else {
			from := m.reader.Pointer() - 1
			msg, err := ReadMessage(m.msgType, m.reader)
			if err != nil {
				return fmt.Errorf("read message err: %s", err)
			}
			if m.msgType == MsgBatchMeta || m.msgType == MsgBatchMetadata {
				if len(m.list) > 0 {
					return fmt.Errorf("batch meta not at the start of batch")
				}
				switch message := msg.(type) {
				case *BatchMetadata:
					m.version = int(message.Version)
				case *BatchMeta:
					m.version = 0
				}
				if m.version != 1 {
					// Unsupported tracker version, reset reader
					m.list = m.list[:0]
					m.reader.SetPointer(0)
					return nil
				}
			}

			// Add message meta to list
			m.list = append(m.list, &MessageMeta{
				msgType: m.msgType,
				msgSize: uint64(m.reader.Pointer() - from),
				msgFrom: uint64(from),
			})
		}
	}
}

func (m *messageReaderImpl) Next() bool {
	if m.broken {
		return false
	}

	// For new version of tracker
	if len(m.list) > 0 {
		if m.listPtr >= len(m.list) {
			return false
		}

		meta := m.list[m.listPtr]
		m.listPtr++
		m.message = &RawMessage{
			tp:     meta.msgType,
			data:   m.data[meta.msgFrom : meta.msgFrom+meta.msgSize],
			broken: &m.broken,
			meta:   &message{},
		}
		return true
	}

	// For prev version of tracker
	var msg Message
	var err error

	// Try to read and decode message type, message size and check range in
	m.msgType, err = m.reader.ReadUint()
	if err != nil {
		if err != io.EOF {
			m.err = fmt.Errorf("read message type err: %s", err)
		}
		// Reached the end of batch
		return false
	}

	// Read and decode message
	msg, err = ReadMessage(m.msgType, m.reader)
	if err != nil {
		m.err = fmt.Errorf("read message err: %s", err)
		return false
	}
	m.message = msg
	return true
}

func (m *messageReaderImpl) Message() Message {
	return m.message
}
