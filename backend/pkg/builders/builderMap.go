package builders

import (
	"context"
	"openreplay/backend/pkg/logger"
	"sync"
	"time"

	"openreplay/backend/pkg/handlers"
	. "openreplay/backend/pkg/messages"
)

const ForceDeleteTimeout = 30 * time.Minute

type builderMap struct {
	log            logger.Logger
	handlersFabric func() []handlers.MessageProcessor
	sessions       map[uint64]*builder
	mutex          *sync.Mutex
	events         chan Message
	done           chan struct{}
}

type EventBuilder interface {
	Events() chan Message
	HandleMessage(msg Message)
	Stop()
}

func NewBuilderMap(log logger.Logger, handlersFabric func() []handlers.MessageProcessor) EventBuilder {
	b := &builderMap{
		log:            log,
		handlersFabric: handlersFabric,
		sessions:       make(map[uint64]*builder),
		mutex:          &sync.Mutex{},
		events:         make(chan Message, 1024*10),
		done:           make(chan struct{}),
	}
	go b.worker()
	return b
}

func (m *builderMap) getBuilder(sessionID uint64) *builder {
	m.mutex.Lock()
	b := m.sessions[sessionID]
	if b == nil {
		b = NewBuilder(sessionID, m.events, m.handlersFabric()...)
		m.sessions[sessionID] = b
	}
	m.mutex.Unlock()
	return b
}

func (m *builderMap) Events() chan Message {
	return m.events
}

func (m *builderMap) HandleMessage(msg Message) {
	if err := m.getBuilder(msg.SessionID()).handleMessage(msg); err != nil {
		ctx := context.WithValue(context.Background(), "sessionID", msg.SessionID())
		m.log.Error(ctx, "can't handle message: %s", err)
	}
}

func (m *builderMap) worker() {
	tick := time.Tick(10 * time.Second)
	for {
		select {
		case <-tick:
			m.checkSessions()
		case <-m.done:
			return
		}
	}
}

func (m *builderMap) checkSessions() {
	m.mutex.Lock()
	deleted := 0
	now := time.Now()
	for sessID, b := range m.sessions {
		// Check session's events
		if b.ended || b.lastSystemTime.Add(ForceDeleteTimeout).Before(now) {
			// Build rest of messages
			for _, p := range b.processors {
				if rm := p.Build(); rm != nil {
					rm.Meta().SetSessionID(sessID)
					m.events <- rm
				}
			}
			delete(m.sessions, sessID)
			deleted++
		}
	}
	m.mutex.Unlock()
}

func (m *builderMap) Stop() {
	m.done <- struct{}{}
	m.checkSessions()
	close(m.events)
}
