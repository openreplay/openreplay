package messages

import (
	"fmt"
	"io"
)

type SessionSearch struct {
	message
	Timestamp uint64
	Partition uint64
}

func (msg *SessionSearch) Encode() []byte {
	buf := make([]byte, 11)
	buf[0] = 127
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Partition, buf, p)
	return buf[:p]
}

func (msg *SessionSearch) TypeID() int {
	return 127
}

func DecodeExtraMessage(code string, reader io.Reader) (Message, error) {
	var err error
	if code != "127" {
		return nil, fmt.Errorf("unknown message code: %s", code)
	}
	msg := &SessionSearch{}
	if msg.Timestamp, err = ReadUint(reader); err != nil {
		return nil, fmt.Errorf("can't read message timestamp: %s", err)
	}
	if msg.Partition, err = ReadUint(reader); err != nil {
		return nil, fmt.Errorf("can't read last partition: %s", err)
	}
	return msg, nil
}
