package heuristics

import (
  . "openreplay/backend/pkg/messages"
)


const MIN_TIME_AFTER_LAST_HEARTBEAT = 60 * 1000

type anr struct {
	readyMessageStore
	lastLabel string
	lastHeartbeatTimestamp uint64
	lastHeartbeatIndex uint64
}

func (h *anr) buildIf(timestamp uint64) {
	if h.lastHeartbeatTimestamp != 0 && h.lastHeartbeatTimestamp + MIN_TIME_AFTER_LAST_HEARTBEAT <= timestamp  {
		m := &IOSIssueEvent{
			Type: "anr",
			ContextString: h.lastLabel,
			//Context: "{}",
			//Payload: fmt.SPrint
		}
		m.Timestamp = h.lastHeartbeatTimestamp
		m.Index = h.lastHeartbeatIndex // Associated Index/ MessageID ?
		h.append(m)
		h.lastHeartbeatTimestamp = 0
		h.lastHeartbeatIndex = 0
	}
}

func (h *anr) HandleMessage(msg Message) {
	switch m := msg.(type) {
	case *IOSClickEvent:
		h.buildIf(m.Timestamp)
		h.lastLabel = m.Label
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *IOSInputEvent:
		h.buildIf(m.Timestamp)
		h.lastLabel = m.Label
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *IOSPerformanceEvent:
		h.buildIf(m.Timestamp)
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *IOSSessionEnd:
		h.buildIf(m.Timestamp)
	}
}