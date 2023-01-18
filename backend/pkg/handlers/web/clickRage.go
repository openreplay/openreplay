package web

import (
	"encoding/json"
	"log"

	. "openreplay/backend/pkg/messages"
)

/*
	Handler name: ClickRage
	Input event:  MouseClick
	Output event: IssueEvent
*/

const MAX_TIME_DIFF = 300
const MIN_CLICKS_IN_A_ROW = 3

type ClickRageDetector struct {
	lastTimestamp        uint64
	lastLabel            string
	firstInARawTimestamp uint64
	firstInARawMessageId uint64
	countsInARow         int
	url                  string
}

func (crd *ClickRageDetector) reset() {
	crd.lastTimestamp = 0
	crd.lastLabel = ""
	crd.firstInARawTimestamp = 0
	crd.firstInARawMessageId = 0
	crd.countsInARow = 0
	crd.url = ""
}

func (crd *ClickRageDetector) Build() Message {
	defer crd.reset()
	if crd.countsInARow >= MIN_CLICKS_IN_A_ROW {
		payload, err := json.Marshal(struct{ Count int }{crd.countsInARow})
		if err != nil {
			log.Printf("can't marshal ClickRage payload to json: %s", err)
		}
		event := &IssueEvent{
			Type:          "click_rage",
			ContextString: crd.lastLabel,
			Payload:       string(payload),
			Timestamp:     crd.firstInARawTimestamp,
			MessageID:     crd.firstInARawMessageId,
			URL:           crd.url,
		}
		return event
	}
	return nil
}

func (crd *ClickRageDetector) Handle(message Message, messageID uint64, timestamp uint64) Message {
	switch msg := message.(type) {
	case *MouseClick:
		if crd.url == "" && msg.Url != "" {
			crd.url = msg.Url
		}
		// TODO: check if we it is ok to capture clickRage event without the connected ClickEvent in db.
		if msg.Label == "" {
			return crd.Build()
		}
		if crd.lastLabel == msg.Label && timestamp-crd.lastTimestamp < MAX_TIME_DIFF {
			crd.lastTimestamp = timestamp
			crd.countsInARow += 1
			return nil
		}
		event := crd.Build()
		crd.lastTimestamp = timestamp
		crd.lastLabel = msg.Label
		crd.firstInARawTimestamp = timestamp
		crd.firstInARawMessageId = messageID
		crd.countsInARow = 1
		if crd.url == "" && msg.Url != "" {
			crd.url = msg.Url
		}
		return event
	}
	return nil
}
