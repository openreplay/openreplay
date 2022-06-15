package messages

import (
	"fmt"
	"io"
)

type SessionFinished struct {
	message
	Timestamp uint64
}

func (msg *SessionFinished) Encode() []byte {
	buf := make([]byte, 11)
	buf[0] = 127
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	return buf[:p]
}

func (msg *SessionFinished) TypeID() int {
	return 127
}

func DecodeExtraMessage(code string, reader io.Reader) (Message, error) {
	var err error
	if code != "127" {
		return nil, fmt.Errorf("unknown message code: %s", code)
	}
	trigger := &SessionFinished{}
	if trigger.Timestamp, err = ReadUint(reader); err != nil {
		return nil, fmt.Errorf("can't read message timestamp: %s", err)
	}
	return trigger, nil
}
