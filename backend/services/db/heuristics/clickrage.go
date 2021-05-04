package heuristics

import (
  . "openreplay/backend/pkg/messages"
)


const CLICK_TIME_DIFF = 200
const MIN_CLICKS_IN_A_ROW = 3

type clickrage struct {
	readyMessageStore
	lastTimestamp  uint64
	lastLabel string
	firstInARawTimestamp uint64
	firstInARawSeqIndex uint64
	countsInARow int	
}

func (h *clickrage) build() {
	if h.countsInARow >= MIN_CLICKS_IN_A_ROW {
		m := &IOSIssueEvent{
			Type: "click_rage",
			ContextString: h.lastLabel,
			//Context: "{}",
			//Payload: fmt.SPrint
		}
		m.Timestamp = h.firstInARawTimestamp
		m.Index = h.firstInARawSeqIndex // Associated Index/ MessageID ?
		h.append(m)
	}
	h.lastTimestamp = 0
	h.lastLabel = ""
	h.firstInARawTimestamp = 0
	h.firstInARawSeqIndex = 0
	h.countsInARow = 0
}

func (h *clickrage) HandleMessage(msg Message) {
	switch m := msg.(type) {
	case *IOSClickEvent:
		if h.lastTimestamp + CLICK_TIME_DIFF < m.Timestamp && h.lastLabel == m.Label {
			h.lastTimestamp = m.Timestamp
			h.countsInARow += 1
			return
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
}