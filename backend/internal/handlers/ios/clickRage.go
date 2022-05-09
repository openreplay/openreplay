package ios

import (
	"openreplay/backend/internal/handlers"
	"openreplay/backend/internal/handlers/web"
	. "openreplay/backend/pkg/messages"
)

const CLICK_TIME_DIFF = 200

//const MIN_CLICKS_IN_A_ROW = 3

type ClickRageDetector struct {
	handlers.ReadyMessageStore
	lastTimestamp        uint64
	lastLabel            string
	firstInARawTimestamp uint64
	firstInARawSeqIndex  uint64
	countsInARow         int
}

func (h *ClickRageDetector) Handle(message Message, messageID uint64, timestamp uint64) Message {
	switch m := message.(type) {
	case *IOSClickEvent:
		if h.lastTimestamp+CLICK_TIME_DIFF < m.Timestamp && h.lastLabel == m.Label {
			h.lastTimestamp = m.Timestamp
			h.countsInARow += 1
			return nil
		}
		h.build()
		if m.Label != "" {
			h.lastTimestamp = m.Timestamp
			h.lastLabel = m.Label
			h.firstInARawTimestamp = m.Timestamp
			h.firstInARawSeqIndex = m.Index
			h.countsInARow = 1
		}
	case *IOSSessionEnd:
		h.build()
	}
	return nil
}

func (h *ClickRageDetector) Build() Message {
	//TODO implement me
	panic("implement me")
}

func (h *ClickRageDetector) build() {
	if h.countsInARow >= web.MIN_CLICKS_IN_A_ROW {
		m := &IOSIssueEvent{
			Type:          "click_rage",
			ContextString: h.lastLabel,
		}
		m.Timestamp = h.firstInARawTimestamp
		m.Index = h.firstInARawSeqIndex // Associated Index/ MessageID ?
		h.Append(m)
	}
	h.lastTimestamp = 0
	h.lastLabel = ""
	h.firstInARawTimestamp = 0
	h.firstInARawSeqIndex = 0
	h.countsInARow = 0
}

func (h *ClickRageDetector) HandleMessage(msg Message) {
	// TODO: delete it
}
