package builder

import (
	"openreplay/backend/internal/handlers"
	. "openreplay/backend/pkg/messages"
)

type builderMap struct {
	handlers []handlers.MessageProcessor
	sessions map[uint64]*builder
}

func NewBuilderMap(handlers ...handlers.MessageProcessor) *builderMap {
	return &builderMap{
		handlers: handlers,
		sessions: make(map[uint64]*builder),
	}
}

func (m *builderMap) GetBuilder(sessionID uint64) *builder {
	b := m.sessions[sessionID]
	if b == nil {
		b = NewBuilder(m.handlers...)
		m.sessions[sessionID] = b
	}
	return b
}

func (m *builderMap) HandleMessage(sessionID uint64, msg Message, messageID uint64) {
	b := m.GetBuilder(sessionID)
	b.handleMessage(msg, messageID)
}

func (m *builderMap) IterateReadyMessages(operatingTs int64, iter func(sessionID uint64, msg Message)) {
	for sessionID, b := range m.sessions {
		sessionEnded := b.checkTimeouts(operatingTs)
		b.iterateReadyMessage(func(msg Message) {
			iter(sessionID, msg)
		})
		if sessionEnded {
			delete(m.sessions, sessionID)
		}
	}
}
