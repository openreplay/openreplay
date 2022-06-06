package ios

import (
	"openreplay/backend/pkg/handlers"
	. "openreplay/backend/pkg/messages"
)

/*
	Handler name: AppNotResponding
	Input events: IOSClickEvent,
				  IOSInputEvent,
				  IOSPerformanceEvent,
				  IOSSessionEnd
	Output event: IOSIssueEvent
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
	case *IOSClickEvent:
		event = h.build(m.Timestamp)
		h.lastLabel = m.Label
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *IOSInputEvent:
		event = h.build(m.Timestamp)
		h.lastLabel = m.Label
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *IOSPerformanceEvent:
		event = h.build(m.Timestamp)
		h.lastHeartbeatTimestamp = m.Timestamp
		h.lastHeartbeatIndex = m.Index
	case *IOSSessionEnd:
		event = h.build(m.Timestamp)
	}
	return event
}

func (h *AppNotResponding) Build() Message {
	return h.build(h.lastTimestamp)
}

func (h *AppNotResponding) build(timestamp uint64) Message {
	if h.lastHeartbeatTimestamp != 0 && h.lastHeartbeatTimestamp+MIN_TIME_AFTER_LAST_HEARTBEAT <= timestamp {
		event := &IOSIssueEvent{
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
