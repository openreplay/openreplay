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
		b = NewBuilder(m.handlers...) // Should create new instances
		m.sessions[sessionID] = b
	}
	return b
}

func (m *builderMap) HandleMessage(sessionID uint64, msg Message, messageID uint64) {
	b := m.GetBuilder(sessionID)
	b.handleMessage(msg, messageID)
}

func (m *builderMap) iterateSessionReadyMessages(sessionID uint64, b *builder, iter func(msg Message)) {
	if b.ended {
		for _, p := range b.processors {
			if rm := p.Build(); rm != nil {
				b.readyMsgs = append(b.readyMsgs, rm)
			}
		}
	}
	b.iterateReadyMessage(iter)
	if b.ended {
		delete(m.sessions, sessionID)
	}
}

func (m *builderMap) IterateReadyMessages(iter func(sessionID uint64, msg Message)) {
	for sessionID, session := range m.sessions {
		m.iterateSessionReadyMessages(
			sessionID,
			session,
			func(msg Message) {
				iter(sessionID, msg)
			},
		)
	}
}

func (m *builderMap) IterateSessionReadyMessages(sessionID uint64, iter func(msg Message)) {
	session, ok := m.sessions[sessionID]
	if !ok {
		return
	}
	m.iterateSessionReadyMessages(
		sessionID,
		session,
		inter,
	)
}
