package sessions

import (
	"log"
	"time"

	"openreplay/backend/pkg/handlers"
	. "openreplay/backend/pkg/messages"
)

const ForceDeleteTimeout = 30 * time.Minute

type builderMap struct {
	handlersFabric func() []handlers.MessageProcessor
	sessions       map[uint64]*builder
	events         chan Message
}

type EventBuilder interface {
	HandleMessage(msg Message)
	CheckSessions()
	Events() chan Message
}

func NewBuilderMap(handlersFabric func() []handlers.MessageProcessor) EventBuilder {
	b := &builderMap{
		handlersFabric: handlersFabric,
		sessions:       make(map[uint64]*builder),
		events:         make(chan Message, 1024),
	}
	return b
}

func (m *builderMap) getBuilder(sessionID uint64) *builder {
	b := m.sessions[sessionID]
	if b == nil {
		b = NewBuilder(sessionID, m.handlersFabric()...) // Should create new instances
		m.sessions[sessionID] = b
	}
	return b
}

func (m *builderMap) Events() chan Message {
	return m.events
}

func (m *builderMap) HandleMessage(msg Message) {
	m.getBuilder(msg.SessionID()).handleMessage(msg)
}

func (m *builderMap) CheckSessions() {
	deleted := 0
	now := time.Now()
	for sessID, eventBuilder := range m.sessions {
		// Check session's events
		m.iterateSessionReadyMessages(sessID, eventBuilder)
		// Check session age and delete if it's old enough
		if eventBuilder.lastSystemTime.Add(ForceDeleteTimeout).Before(now) {
			delete(m.sessions, sessID)
			deleted++
		}
	}
	if deleted > 0 {
		log.Printf("deleted %d sessions from message builder", deleted)
	}
}

func (m *builderMap) iterateSessionReadyMessages(sessionID uint64, b *builder) {
	if b.ended || b.lastSystemTime.Add(ForceDeleteTimeout).Before(time.Now()) {
		for _, p := range b.processors {
			if rm := p.Build(); rm != nil {
				rm.Meta().SetSessionID(sessionID)
				b.readyMsgs = append(b.readyMsgs, rm)
			}
		}
	}
	b.iterateReadyMessages(m.events)
	if b.ended {
		delete(m.sessions, sessionID)
	}
}
