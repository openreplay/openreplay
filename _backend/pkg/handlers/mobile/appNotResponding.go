package mobile

import (
	"openreplay/backend/pkg/handlers"
	. "openreplay/backend/pkg/messages"
)

/*
	Handler name: AppNotResponding
	Input events: MobileClickEvent,
				  MobileInputEvent,
				  MobilePerformanceEvent,
				  MobileSessionEnd
	Output event: MobileIssueEvent
*/

const MIN_TIME_AFTER_LAST_HEARTBEAT = 60 * 1000

type AppNotResponding struct {
	handlers.ReadyMessageStore
	lastLabel              string
	lastHeartbeatTimestamp uint64
	lastHeartbeatIndex     uint64
	lastTimestamp          uint64
}

func (h *AppNotResponding) Handle(message Message, messageID uint64, timestamp uint64) Message {
	h.lastTimestamp = timestamp
	var event Message = nil
	switch m := message.(type) {
	case *MobileClickEvent:
		event = h.build(m.Timestamp)
		h.lastLabel = m.Label
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *MobileInputEvent:
		event = h.build(m.Timestamp)
		h.lastLabel = m.Label
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *MobilePerformanceEvent:
		event = h.build(m.Timestamp)
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *MobileSessionEnd:
		event = h.build(m.Timestamp)
	}
	return event
}

func (h *AppNotResponding) Build() Message {
	return h.build(h.lastTimestamp)
}

func (h *AppNotResponding) build(timestamp uint64) Message {
	if h.lastHeartbeatTimestamp != 0 && h.lastHeartbeatTimestamp+MIN_TIME_AFTER_LAST_HEARTBEAT <= timestamp {
		event := &MobileIssueEvent{
			Type:          "anr",
			ContextString: h.lastLabel,
			Timestamp:     h.lastHeartbeatTimestamp,
		}
		event.Index = h.lastHeartbeatIndex // Associated Index/ MessageID ?
		// Reset
		h.lastHeartbeatTimestamp = 0
		h.lastHeartbeatIndex = 0
		return event
	}
	return nil
}
