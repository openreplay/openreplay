package ios

import (
	"openreplay/backend/internal/handlers"
	. "openreplay/backend/pkg/messages"
)

// app is not responding detector

const MIN_TIME_AFTER_LAST_HEARTBEAT = 60 * 1000

type AppNotResponding struct {
	handlers.ReadyMessageStore
	lastLabel              string
	lastHeartbeatTimestamp uint64
	lastHeartbeatIndex     uint64
}

func (h *AppNotResponding) Handle(message Message, messageID uint64, timestamp uint64) Message {
	switch m := message.(type) {
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
	return nil
}

func (h *AppNotResponding) Build() Message {
	//TODO implement me
	panic("implement me")
}

func (h *AppNotResponding) buildIf(timestamp uint64) {
	if h.lastHeartbeatTimestamp != 0 && h.lastHeartbeatTimestamp+MIN_TIME_AFTER_LAST_HEARTBEAT <= timestamp {
		m := &IOSIssueEvent{
			Type:          "anr",
			ContextString: h.lastLabel,
		}
		m.Timestamp = h.lastHeartbeatTimestamp
		m.Index = h.lastHeartbeatIndex // Associated Index/ MessageID ?
		h.Append(m)
		h.lastHeartbeatTimestamp = 0
		h.lastHeartbeatIndex = 0
	}
}

func (h *AppNotResponding) HandleMessage(msg Message) {
	// TODO: delete it
}
