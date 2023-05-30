package messages

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"sort"
	"time"
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

func SplitMessages(sessID string, data []byte) ([]*msgInfo, error) {
	messages := make([]*msgInfo, 0)
	indexes := make(map[uint64]bool)
	hadDuplicates := false
	var lastTimestamp uint64
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

		if _, ok := indexes[msgIndex]; ok && !hadDuplicates {
			hadDuplicates = true
			log.Printf("Session %s has duplicate messages", sessID)
			continue
		}
		indexes[msgIndex] = true

		// Update current timestamp
		if msgType == MsgTimestamp {
			msgBody := body.(*Timestamp)
			lastTimestamp = msgBody.Timestamp
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

func SplitByDuration(messages []*msgInfo, duration uint64) int {
	firstTs := messages[0].timestamp
	for i, msg := range messages {
		if msg.timestamp-firstTs > duration {
			// TODO: remove debug logs
			log.Println("split: ", time.UnixMilli(int64(firstTs)), time.UnixMilli(int64(msg.timestamp)))
			log.Println("first: ", i, " second: ", len(messages)-i)
			return i
		}
	}
	return 0
}

func DOMRatio(sessID string, messages []*msgInfo) {
	window := uint64(1000)
	nextTs := messages[0].timestamp + window
	domMsgs := 0
	allMsgs := 0
	result := make([]int, 0)
	for _, msg := range messages {
		if msg.timestamp >= nextTs {
			result = append(result, (domMsgs*100)/allMsgs)
			nextTs = msg.timestamp + window
			domMsgs = 0
			allMsgs = 0
		}
		switch msg.msgType {
		case MsgCreateDocument, MsgCreateElementNode, MsgCreateTextNode, MsgSetNodeAttribute, MsgSetNodeData, MsgSetCSSData:
			domMsgs++
		}
		allMsgs++
	}

	// Find pivot point for mob file
	last := 0
	piv := 0
	low := -1
	threshold := 15
	dur := 3
	for i := 1; i < len(result); i++ {
		if result[i] >= result[i-1] {
			last = i
		} else {
			if result[i] < threshold {
				if low == -1 {
					low = i
				} else {
					if i-low >= dur {
						piv = last
					}
				}
			}
		}
	}
	log.Printf("SessID: %s, pivot: %d, dom ratio: %d", sessID, piv, result)
}
