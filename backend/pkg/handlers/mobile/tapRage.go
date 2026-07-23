package mobile

import (
	"encoding/json"

	. "openreplay/backend/pkg/messages"
)

const TapTimeDiff = 300
const MinTapsInARow = 3

type TapRageDetector struct {
	lastTimestamp        uint64
	lastLabel            string
	firstInARawTimestamp uint64
	firstInARawSeqIndex  uint64
	countsInARow         int
}

func (h *TapRageDetector) MessageTypes() []int {
	return []int{MsgMobileClickEvent, MsgMobileSessionEnd}
}

func (h *TapRageDetector) reset() {
	h.lastTimestamp = 0
	h.lastLabel = ""
	h.firstInARawTimestamp = 0
	h.firstInARawSeqIndex = 0
	h.countsInARow = 0
}

func (h *TapRageDetector) createPayload() string {
	p, err := json.Marshal(struct{ Count int }{h.countsInARow})
	if err != nil {
		return ""
	}
	return string(p)
}

func (h *TapRageDetector) Build() Message {
	defer h.reset()
	if h.countsInARow < MinTapsInARow {
		return nil
	}
	event := &MobileIssueEvent{
		Type:          "tap_rage",
		ContextString: h.lastLabel,
		Timestamp:     h.firstInARawTimestamp,
		Payload:       h.createPayload(),
	}
	event.Index = h.firstInARawSeqIndex
	return event
}

func (h *TapRageDetector) Handle(message Message, timestamp uint64) Message {
	switch message.TypeID() {
	case MsgMobileClickEvent:
		m, ok := message.Decode().(*MobileClickEvent)
		if !ok {
			return nil
		}
		if m.Label == "" {
			return h.Build()
		}
		if h.lastLabel == m.Label && m.Timestamp >= h.lastTimestamp && m.Timestamp-h.lastTimestamp < TapTimeDiff {
			h.lastTimestamp = m.Timestamp
			h.countsInARow += 1
			return nil
		}
		event := h.Build()
		h.lastTimestamp = m.Timestamp
		h.lastLabel = m.Label
		h.firstInARawTimestamp = m.Timestamp
		h.firstInARawSeqIndex = m.Index
		h.countsInARow = 1
		return event
	case MsgMobileSessionEnd:
		return h.Build()
	}
	return nil
}
