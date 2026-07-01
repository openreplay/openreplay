package messages

import (
	"fmt"
	"io"
)

type MessageReader interface {
<<<<<<< HEAD
	Parse(filter *TypeFilter) (err error)
=======
	Parse(filter map[int]struct{}) (err error)
>>>>>>> c1f297d01 (Message parser optimization (#4741))
	Next() bool
	Message() Message
}

func NewMessageReader(data []byte) MessageReader {
	return &messageReaderImpl{
		data:   data,
		reader: NewBytesReader(data),
	}
}

type messageReaderImpl struct {
	data     []byte
<<<<<<< HEAD
	reader   *bytesReaderImpl
=======
	reader   BytesReader
>>>>>>> c1f297d01 (Message parser optimization (#4741))
	msgType  uint64
	msgSize  uint64
	msgBody  []byte
	version  int
	broken   bool
	message  Message
	err      error
<<<<<<< HEAD
	messages []RawMessage
=======
	messages []*RawMessage
>>>>>>> c1f297d01 (Message parser optimization (#4741))
	listPtr  int
	index    uint64
}

<<<<<<< HEAD
func (m *messageReaderImpl) Reset(data []byte) {
	m.data = data
	m.reader.Reset(data)
	m.version = 0
	m.message = nil
	m.err = nil
}

func (m *messageReaderImpl) Parse(filter *TypeFilter) (err error) {
	m.listPtr = 0
	m.index = 0
	m.messages = m.messages[:0]
=======
func (m *messageReaderImpl) Parse(filter map[int]struct{}) (err error) {
	m.listPtr = 0
	m.index = 0
	m.messages = make([]*RawMessage, 0, 1024)
>>>>>>> c1f297d01 (Message parser optimization (#4741))
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
		m.index++

		// Read message body (and decode if protocol version less than 1)
		if m.version > 0 && MessageHasSize(m.msgType) {
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
			m.reader.SetPointer(curr + int64(m.msgSize))

<<<<<<< HEAD
			if filter != nil && !filter.Has(int(m.msgType)) {
				continue
			}

			// Rewrite the type right before the body (over the last size byte)
			// so RawMessage.data is a contiguous [type][body] view into the
			// batch buffer with no extra allocation
			var from int
			if m.msgType < 0x80 {
				from = int(curr) - 1
				m.data[from] = byte(m.msgType)
			} else {
				from = int(curr) - ByteSizeUint(m.msgType)
				WriteUint(m.msgType, m.data, from)
			}

			m.messages = append(m.messages, RawMessage{
				tp:     m.msgType,
				data:   m.data[from : curr+int64(m.msgSize)],
				broken: &m.broken,
				meta: message{
=======
			if filter != nil {
				if _, ok := filter[int(m.msgType)]; !ok {
					continue
				}
			}

			// Dirty hack to avoid extra memory allocation
			mTypeByteSize := ByteSizeUint(m.msgType)
			from := int(curr) - mTypeByteSize
			WriteUint(m.msgType, m.data, from)

			m.messages = append(m.messages, &RawMessage{
				tp:     m.msgType,
				data:   m.data[uint64(from) : uint64(from)+m.msgSize+1],
				broken: &m.broken,
				meta: &message{
>>>>>>> c1f297d01 (Message parser optimization (#4741))
					Index: m.index,
				},
			})
		} else {
			from := m.reader.Pointer() - 1
			msg, err := ReadMessage(m.msgType, m.reader)
			if err != nil {
				return fmt.Errorf("read message err: %s", err)
			}
			if m.msgType == MsgBatchMetadata {
				if m.index > 1 {
					return fmt.Errorf("batch meta not at the start of batch")
				}
				switch message := msg.(type) {
				case *BatchMetadata:
					m.version = int(message.Version)
					m.index = message.PageNo<<32 + message.FirstIndex
				}
				if m.version < 1 || m.version > 5 {
					// Unsupported tracker version, reset reader
					m.messages = m.messages[:0]
					m.reader.SetPointer(0)
					return nil
				}
			} else if m.msgType == MsgMobileBatchMeta {
				switch message := msg.(type) {
				case *MobileBatchMeta:
					m.index = message.FirstIndex
				}
			}

<<<<<<< HEAD
			if filter != nil && !filter.Has(int(m.msgType)) {
				continue
			}

			m.messages = append(m.messages, RawMessage{
				tp:     m.msgType,
				data:   m.data[from:m.reader.Pointer()],
				broken: &m.broken,
				meta: message{
=======
			if filter != nil {
				if _, ok := filter[int(m.msgType)]; !ok {
					continue
				}
			}

			m.messages = append(m.messages, &RawMessage{
				tp:     m.msgType,
				data:   m.data[uint64(from):uint64(m.reader.Pointer())],
				broken: &m.broken,
				meta: &message{
>>>>>>> c1f297d01 (Message parser optimization (#4741))
					Index: m.index,
				},
			})
		}
	}
}

func (m *messageReaderImpl) Next() bool {
	if m.broken {
		return false
	}

	// For new version of tracker
	if len(m.messages) > 0 {
		if m.listPtr >= len(m.messages) {
			return false
		}

<<<<<<< HEAD
		m.message = &m.messages[m.listPtr]
=======
		m.message = m.messages[m.listPtr]
>>>>>>> c1f297d01 (Message parser optimization (#4741))
		m.listPtr++
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
