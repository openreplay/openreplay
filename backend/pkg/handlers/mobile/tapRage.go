package mobile

import (
	"encoding/json"

	"openreplay/backend/pkg/handlers"
	. "openreplay/backend/pkg/messages"
)

const TapTimeDiff = 300
const MinTapsInARow = 3

type TapRageDetector struct {
	handlers.ReadyMessageStore
	lastTimestamp        uint64
	lastLabel            string
	firstInARawTimestamp uint64
	firstInARawSeqIndex  uint64
	countsInARow         int
}

func (h *TapRageDetector) createPayload() string {
	p, err := json.Marshal(struct{ Count int }{h.countsInARow})
	if err != nil {
		return ""
	}
	return string(p)
}

func (h *TapRageDetector) Build() Message {
	if h.countsInARow >= MinTapsInARow {
		event := &MobileIssueEvent{
			Type:          "tap_rage",
			ContextString: h.lastLabel,
			Timestamp:     h.firstInARawTimestamp,
			Payload:       h.createPayload(),
		}
		event.Index = h.firstInARawSeqIndex // Associated Index/ MessageID ?
		return event
	}
	h.lastTimestamp = 0
	h.lastLabel = ""
	h.firstInARawTimestamp = 0
	h.firstInARawSeqIndex = 0
	h.countsInARow = 0
	return nil
}

func (h *TapRageDetector) Handle(message Message, timestamp uint64) Message {
	var event Message = nil
	switch m := message.(type) {
	case *MobileClickEvent:
		if h.lastTimestamp+TapTimeDiff < m.Timestamp && h.lastLabel == m.Label {
			h.lastTimestamp = m.Timestamp
			h.countsInARow += 1
			return nil
		}
		event = h.Build()
		if m.Label != "" {
			h.lastTimestamp = m.Timestamp
			h.lastLabel = m.Label
			h.firstInARawTimestamp = m.Timestamp
			h.firstInARawSeqIndex = m.Index
			h.countsInARow = 1
		}
	case *MobileSessionEnd:
		event = h.Build()
	}
	return event
}
