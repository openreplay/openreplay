package builder

import (
		"encoding/json"

	. "openreplay/backend/pkg/messages"
)


const CLICK_TIME_DIFF = 300
const MIN_CLICKS_IN_A_ROW = 3

type clickRageDetector struct {
	lastTimestamp  uint64
	lastLabel string
	firstInARawTimestamp uint64
	firstInARawMessageId uint64
	countsInARow int
}


func (crd *clickRageDetector) Build() *IssueEvent {
	var i *IssueEvent
	if crd.countsInARow >= MIN_CLICKS_IN_A_ROW {
		payload, _ := json.Marshal(struct{Count int }{crd.countsInARow,})
		i = &IssueEvent{
			Type: "click_rage",
			ContextString: crd.lastLabel,
			Payload: string(payload), // TODO: json encoder
			Timestamp: crd.firstInARawTimestamp,
			MessageID: crd.firstInARawMessageId,
		}
	}
	crd.lastTimestamp = 0
	crd.lastLabel = ""
	crd.firstInARawTimestamp = 0
	crd.firstInARawMessageId = 0
	crd.countsInARow = 0
	return i
}

func (crd *clickRageDetector) HandleMouseClick(msg *MouseClick,  messageID uint64, timestamp uint64) *IssueEvent {
	if crd.lastTimestamp + CLICK_TIME_DIFF > timestamp && crd.lastLabel == msg.Label {
		crd.lastTimestamp = timestamp
		crd.countsInARow += 1
		return nil
	}
	i := crd.Build()
	if msg.Label != "" {
		crd.lastTimestamp = timestamp
		crd.lastLabel = msg.Label
		crd.firstInARawTimestamp = timestamp
		crd.firstInARawMessageId = messageID
		crd.countsInARow = 1
	}
	return i
}