package messages

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"sort"
)

type msgInfo struct {
	index   uint64
	start   int64
	end     int64
	body    Message
	msgType uint64
}

func (m *msgInfo) Print() string {
	return fmt.Sprintf("index: %d, start: %d, end: %d, type: %d, body: %s", m.index, m.start, m.end, m.msgType, m.body)
}

func SplitMessages(data []byte) ([]*msgInfo, error) {
	messages := make([]*msgInfo, 0)
	indexes := make(map[uint64]bool)
	reader := NewBytesReader(data)
	for {
		// Get message start
		msgStart := reader.Pointer()
		if int(msgStart) >= len(data) {
			return messages, nil
		}

		// Read message index
		msgIndex, err := reader.ReadIndex()
		if err != nil {
			if err != io.EOF {
				log.Println(reader.Pointer(), msgStart)
				return messages, fmt.Errorf("read message index err: %s", err)
			}
			return messages, nil
		}

		// Read message type
		msgType, err := reader.ReadUint()
		if err != nil {
			return messages, fmt.Errorf("read message type err: %s", err)
		}

		// Read message body
		body, err := ReadMessage(msgType, reader)
		if err != nil {
			return messages, fmt.Errorf("read message body err: %s", err)
		}

		if _, ok := indexes[msgIndex]; ok {
			log.Printf("duplicate message index: %d", msgIndex)
			continue
		}
		indexes[msgIndex] = true

		// Add new message info to messages slice
		messages = append(messages, &msgInfo{
			index:   msgIndex,
			start:   msgStart,
			end:     reader.Pointer(),
			body:    body,
			msgType: msgType,
		})
	}
}

func SortMessages(messages []*msgInfo) []*msgInfo {
	sort.SliceStable(messages, func(i, j int) bool {
		return messages[i].index < messages[j].index
	})
	return messages
}

func MergeMessages(data []byte, messages []*msgInfo) []byte {
	sortedSession := bytes.NewBuffer(make([]byte, 0, len(data)))
	sortedSession.Write([]byte{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff})
	for _, info := range messages {
		sortedSession.Write(data[info.start+8 : info.end])
	}
	return sortedSession.Bytes()
}
