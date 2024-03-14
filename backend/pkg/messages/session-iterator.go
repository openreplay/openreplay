package messages

import (
	"bytes"
	"fmt"
	"io"
	"sort"
)

type msgInfo struct {
	index     uint64
	start     int64
	end       int64
	body      Message
	msgType   uint64
	timestamp uint64
}

func (m *msgInfo) Print() string {
	return fmt.Sprintf("index: %d, start: %d, end: %d, type: %d, body: %s", m.index, m.start, m.end, m.msgType, m.body)
}

func SplitMessages(data []byte) ([]*msgInfo, error) {
	messages := make([]*msgInfo, 0)
	indexes := make(map[uint64]bool)
	hadDuplicates := false
	var lastTimestamp uint64
	reader := NewBytesReader(data)
	var err error = nil
	for {
		// Get message start
		msgStart := reader.Pointer()
		if int(msgStart) >= len(data) {
			return messages, err
		}

		// Read message index
		msgIndex, err := reader.ReadIndex()
		if err != nil {
			if err != io.EOF {
				return messages, fmt.Errorf("can't read message's index, msgStart: %d, pointer: %d, err: %s",
					msgStart, reader.Pointer(), err)
			}
			return messages, err
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

		if _, ok := indexes[msgIndex]; ok && !hadDuplicates {
			hadDuplicates = true
			continue
		}
		indexes[msgIndex] = true

		// Update current timestamp
		if msgType == MsgTimestamp {
			msgBody := body.(*Timestamp)
			lastTimestamp = msgBody.Timestamp
			err = fmt.Errorf("session has duplicate messages")
		}

		// Add new message info to messages slice
		messages = append(messages, &msgInfo{
			index:     msgIndex,
			start:     msgStart + 8, // start pointer without index (that's why we use +8)
			end:       reader.Pointer(),
			body:      body,
			msgType:   msgType,
			timestamp: lastTimestamp,
		})
	}
}

func SortMessages(messages []*msgInfo) []*msgInfo {
	// Sort messages by index
	sort.SliceStable(messages, func(i, j int) bool {
		if messages[i].timestamp < messages[j].timestamp {
			return true
		}
		if messages[i].timestamp == messages[j].timestamp {
			return messages[i].index < messages[j].index
		}
		return false
	})
	return messages
}

func MergeMessages(data []byte, messages []*msgInfo) []byte {
	sortedSession := bytes.NewBuffer(make([]byte, 0, len(data)))
	// Add maximum possible index value to the start of the session to inform player about new version of mob file
	sortedSession.Write([]byte{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff})

	var lastTsIndex int = -1 // not set
	for i, info := range messages {
		if info.msgType == MsgTimestamp {
			// Save index of last timestamp message and continue to read next message
			lastTsIndex = i
			continue
		}

		// Write last timestamp message if it exists
		if lastTsIndex != -1 {
			tsInfo := messages[lastTsIndex]
			sortedSession.Write(data[tsInfo.start:tsInfo.end])
			lastTsIndex = -1
		}

		// Write current message
		sortedSession.Write(data[info.start:info.end])
	}
	return sortedSession.Bytes()
}
