package ios

import (
	"openreplay/backend/pkg/handlers"
	"openreplay/backend/pkg/handlers/web"
	. "openreplay/backend/pkg/messages"
)

/*
	Handler name: ClickRage
	Input events: IOSClickEvent,
				  IOSSessionEnd
	Output event: IOSIssueEvent
*/

const CLICK_TIME_DIFF = 200

type ClickRageDetector struct {
	handlers.ReadyMessageStore
	lastTimestamp        uint64
	lastLabel            string
	firstInARawTimestamp uint64
	firstInARawSeqIndex  uint64
	countsInARow         int
}

func (h *ClickRageDetector) Handle(message Message, messageID uint64, timestamp uint64) Message {
	var event Message = nil
	switch m := message.(type) {
	case *IOSClickEvent:
		if h.lastTimestamp+CLICK_TIME_DIFF < m.Timestamp && h.lastLabel == m.Label {
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
	case *IOSSessionEnd:
		event = h.Build()
	}
	return event
}

func (h *ClickRageDetector) Build() Message {
	if h.countsInARow >= web.MinClicksInARow {
		event := &IOSIssueEvent{
			Type:          "click_rage",
			ContextString: h.lastLabel,
		}
		event.Timestamp = h.firstInARawTimestamp
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
