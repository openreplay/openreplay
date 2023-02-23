package sessions

import (
	"log"
	"openreplay/backend/pkg/handlers"
	"time"

	. "openreplay/backend/pkg/messages"
)

const ForceDeleteTimeout = 30 * time.Minute

type builderMap struct {
	handlersFabric func() []handlers.MessageProcessor
	sessions       map[uint64]*builder
}

type EventBuilder interface {
	IterateSessionReadyMessages(sessionID uint64, iter func(msg Message))
	IterateReadyMessages(iter func(sessionID uint64, msg Message))
	HandleMessage(msg Message)
	ClearOldSessions()
}

func NewBuilderMap(handlersFabric func() []handlers.MessageProcessor) EventBuilder {
	return &builderMap{
		handlersFabric: handlersFabric,
		sessions:       make(map[uint64]*builder),
	}
}

func (m *builderMap) getBuilder(sessionID uint64) *builder {
	b := m.sessions[sessionID]
	if b == nil {
		b = NewBuilder(sessionID, m.handlersFabric()...) // Should create new instances
		m.sessions[sessionID] = b
	}
	return b
}

func (m *builderMap) HandleMessage(msg Message) {
	m.getBuilder(msg.SessionID()).handleMessage(msg)
}

func (m *builderMap) ClearOldSessions() {
	deleted := 0
	now := time.Now()
	for id, sess := range m.sessions {
		if sess.lastSystemTime.Add(ForceDeleteTimeout).Before(now) {
			// Should delete zombie session
			delete(m.sessions, id)
			deleted++
		}
	}
	if deleted > 0 {
		log.Printf("deleted %d sessions from message builder", deleted)
	}
}

func (m *builderMap) iterateSessionReadyMessages(sessionID uint64, b *builder, iter func(msg Message)) {
	if b.ended || b.lastSystemTime.Add(ForceDeleteTimeout).Before(time.Now()) {
		for _, p := range b.processors {
			if rm := p.Build(); rm != nil {
				rm.Meta().SetSessionID(sessionID)
				b.readyMsgs = append(b.readyMsgs, rm)
			}
		}
	}
	b.iterateReadyMessages(iter)
	if b.ended {
		delete(m.sessions, sessionID)
	}
}

func (m *builderMap) IterateReadyMessages(iter func(sessionID uint64, msg Message)) {
	for sessionID, session := range m.sessions {
		m.iterateSessionReadyMessages(sessionID, session, func(msg Message) { iter(sessionID, msg) })
	}
}

func (m *builderMap) IterateSessionReadyMessages(sessionID uint64, iter func(msg Message)) {
	session, ok := m.sessions[sessionID]
	if !ok {
		return
	}
	m.iterateSessionReadyMessages(sessionID, session, iter)
}
