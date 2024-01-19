package web

import (
	"encoding/json"
	"log"

	. "openreplay/backend/pkg/messages"
)

const MaxTimeDiff = 300
const MinClicksInARow = 3

type ClickRageDetector struct {
	lastTimestamp        uint64
	lastLabel            string
	lastSelector         string
	firstInARawTimestamp uint64
	firstInARawMessageId uint64
	countsInARow         int
	url                  string
}

func (crd *ClickRageDetector) reset() {
	crd.lastTimestamp = 0
	crd.lastLabel = ""
	crd.lastSelector = ""
	crd.firstInARawTimestamp = 0
	crd.firstInARawMessageId = 0
	crd.countsInARow = 0
	crd.url = ""
}

func (crd *ClickRageDetector) createPayload() string {
	p, err := json.Marshal(struct{ Count int }{crd.countsInARow})
	if err != nil {
		log.Printf("can't marshal ClickRage payload to json: %s", err)
		return ""
	}
	return string(p)
}

func (crd *ClickRageDetector) Build() Message {
	defer crd.reset()
	if crd.countsInARow < MinClicksInARow {
		return nil
	}
	return &IssueEvent{
		Type:          "click_rage",
		ContextString: crd.lastLabel,
		Payload:       crd.createPayload(),
		Timestamp:     crd.firstInARawTimestamp,
		MessageID:     crd.firstInARawMessageId,
		URL:           crd.url,
		Context:       crd.lastSelector, // hack to pass selector to db (tags filter)
	}
}

func (crd *ClickRageDetector) Handle(message Message, timestamp uint64) Message {
	switch msg := message.(type) {
	case *MouseClick:
		// Set click url
		if crd.url == "" && msg.Url != "" {
			crd.url = msg.Url
		}
		// Click on different object -> build if we can and reset the builder
		if msg.Label == "" {
			return crd.Build()
		}
		// Update builder with last information
		if crd.lastLabel == msg.Label && timestamp-crd.lastTimestamp < MaxTimeDiff {
			crd.lastTimestamp = timestamp
			crd.countsInARow += 1
			return nil
		}
		// Try to build event
		event := crd.Build()
		// Use current message as init values for new event
		crd.lastTimestamp = timestamp
		crd.lastLabel = msg.Label
		crd.lastSelector = msg.Selector
		crd.firstInARawTimestamp = timestamp
		crd.firstInARawMessageId = message.MsgID()
		crd.countsInARow = 1
		if crd.url == "" && msg.Url != "" {
			crd.url = msg.Url
		}
		return event
	}
	return nil
}
