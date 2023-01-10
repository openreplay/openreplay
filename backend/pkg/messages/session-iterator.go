package messages

import (
	"bytes"
	"fmt"
	"io"
	"log"
)

type msgInfo struct {
	index uint64
	start int64
	end   int64
}

func SplitMessages(data []byte) ([]*msgInfo, error) {
	messages := make([]*msgInfo, 0)
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
				return nil, fmt.Errorf("read message index err: %s", err)
			}
			return messages, nil
		}

		// Read message type
		msgType, err := reader.ReadUint()
		if err != nil {
			return nil, fmt.Errorf("read message type err: %s", err)
		}

		// Read message body
		_, err = ReadMessage(msgType, reader)
		if err != nil {
			return nil, fmt.Errorf("read message body err: %s", err)
		}

		// Add new message info to messages slice
		messages = append(messages, &msgInfo{
			index: msgIndex,
			start: msgStart,
			end:   reader.Pointer(),
		})
	}
}

func SortMessages(messages []*msgInfo) ([]*msgInfo, bool) {
	wasSorted := false
	for i := 1; i < len(messages); i++ {
		j := i
		for j > 0 {
			if messages[j-1].index > messages[j].index {
				messages[j-1], messages[j] = messages[j], messages[j-1]
				wasSorted = true
			}
			j = j - 1
		}
	}
	return messages, wasSorted
}

func MergeMessages(data []byte, messages []*msgInfo) []byte {
	sortedSession := bytes.NewBuffer(make([]byte, 0, len(data)))
	for _, info := range messages {
		sortedSession.Write(data[info.start:info.end])
	}
	return sortedSession.Bytes()
}
