package messages

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"sort"
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

func SortMessages(messages []*msgInfo) []*msgInfo {
	sort.SliceStable(messages, func(i, j int) bool {
		return messages[i].index < messages[j].index
	})
	return messages
}

func MergeMessages(data []byte, messages []*msgInfo) []byte {
	sortedSession := bytes.NewBuffer(make([]byte, 0, len(data)))
	for _, info := range messages {
		sortedSession.Write(data[info.start:info.end])
	}
	return sortedSession.Bytes()
}
