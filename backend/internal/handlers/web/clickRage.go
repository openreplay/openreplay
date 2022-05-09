package web

import (
	"encoding/json"

	. "openreplay/backend/pkg/messages"
)

// TODO: Description of click rage detector

const MAX_TIME_DIFF = 300
const MIN_CLICKS_IN_A_ROW = 3

type ClickRageDetector struct {
	lastTimestamp        uint64
	lastLabel            string
	firstInARawTimestamp uint64
	firstInARawMessageId uint64
	countsInARow         int
}

func (crd *ClickRageDetector) reset() {
	crd.lastTimestamp = 0
	crd.lastLabel = ""
	crd.firstInARawTimestamp = 0
	crd.firstInARawMessageId = 0
	crd.countsInARow = 0
}

func (crd *ClickRageDetector) Build() Message {
	if crd.countsInARow >= MIN_CLICKS_IN_A_ROW {
		payload, _ := json.Marshal(struct{ Count int }{crd.countsInARow})
		i := &IssueEvent{
			Type:          "click_rage",
			ContextString: crd.lastLabel,
			Payload:       string(payload), // TODO: json message field type
			Timestamp:     crd.firstInARawTimestamp,
			MessageID:     crd.firstInARawMessageId,
		}
		crd.reset()
		return i
	}
	crd.reset()
	return nil
}

func (crd *ClickRageDetector) Handle(message Message, messageID uint64, timestamp uint64) Message {
	switch msg := message.(type) {
	case *MouseClick:
		// TODO: check if we it is ok to capture clickrages without the connected CleckEvent in db.
		if msg.Label == "" {
			return crd.Build()
		}
		if crd.lastLabel == msg.Label && timestamp-crd.lastTimestamp < MAX_TIME_DIFF {
			crd.lastTimestamp = timestamp
			crd.countsInARow += 1
			return nil
		}
		i := crd.Build()
		crd.lastTimestamp = timestamp
		crd.lastLabel = msg.Label
		crd.firstInARawTimestamp = timestamp
		crd.firstInARawMessageId = messageID
		crd.countsInARow = 1
		return i
	}
	return nil
}
