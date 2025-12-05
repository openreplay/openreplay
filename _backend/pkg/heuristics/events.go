package heuristics

import (
	"context"
	"fmt"
	"sync"
	"time"

	"openreplay/backend/pkg/handlers"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
)

type Events interface {
	Events() <-chan messages.Message
	HandleMessage(msg messages.Message)
	Stop()
}

type eventsImpl struct {
	log            logger.Logger
	handlersFabric func() []handlers.MessageProcessor
	sessions       map[uint64]*builder
	mutex          sync.Mutex
	events         chan messages.Message
	done           chan struct{}
}

func NewEvents(log logger.Logger, handlersFabric func() []handlers.MessageProcessor) Events {
	b := &eventsImpl{
		log:            log,
		handlersFabric: handlersFabric,
		sessions:       make(map[uint64]*builder),
		events:         make(chan messages.Message, 1024*10),
		done:           make(chan struct{}),
	}
	go b.worker()
	return b
}

func (m *eventsImpl) Events() <-chan messages.Message { return m.events }

func (m *eventsImpl) getBuilder(sessionID uint64) *builder {
	m.mutex.Lock()
	b := m.sessions[sessionID]
	if b == nil {
		b = newBuilder(sessionID, m.events, m.handlersFabric()...)
		m.sessions[sessionID] = b
	}
	m.mutex.Unlock()
	return b
}

func (m *eventsImpl) HandleMessage(msg messages.Message) {
	if err := m.getBuilder(msg.SessionID()).handleMessage(msg); err != nil {
		ctx := context.WithValue(context.Background(), "sessionID", msg.SessionID())
		m.log.Error(ctx, "can't handle message: %s", err)
	}
}

func (m *eventsImpl) worker() {
	t := time.NewTicker(10 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-t.C:
			m.checkSessions()
		case <-m.done:
			return
		}
	}
}

const ForceDeleteTimeout = 30 * time.Minute

func (m *eventsImpl) checkSessions() {
	m.mutex.Lock()
	now := time.Now()
	for sessID, b := range m.sessions {
		if b.ended || b.lastSystemTime.Add(ForceDeleteTimeout).Before(now) {
			for _, p := range b.processors {
				if rm := p.Build(); rm != nil {
					rm.Meta().SetSessionID(sessID)
					m.events <- rm
				}
			}
			delete(m.sessions, sessID)
		}
	}
	m.mutex.Unlock()
}

func (m *eventsImpl) Stop() {
	close(m.done)
	m.checkSessions()
	close(m.events)
}

type builder struct {
	sessionID      uint64
	readyMsgs      chan messages.Message
	timestamp      uint64
	lastMessageID  uint64
	lastSystemTime time.Time
	processors     []handlers.MessageProcessor
	ended          bool
}

func newBuilder(sessionID uint64, events chan messages.Message, handlers ...handlers.MessageProcessor) *builder {
	return &builder{
		sessionID:  sessionID,
		processors: handlers,
		readyMsgs:  events,
	}
}

func (b *builder) shouldEnd(message messages.Message) {
	switch message.(type) {
	case *messages.MobileSessionEnd, *messages.SessionEnd:
		b.ended = true
	}
}

func (b *builder) handleMessage(m messages.Message) error {
	if m.MsgID() < b.lastMessageID {
		return fmt.Errorf("skip message with wrong msgID: %d, lastID: %d", m.MsgID(), b.lastMessageID)
	}
	if m.Time() <= 0 {
		switch m.(type) {
		case *messages.IssueEvent, *messages.PerformanceTrackAggr:
			break
		default:
			return fmt.Errorf("skip message with incorrect timestamp, msgID: %d, msgType: %d", m.MsgID(), m.TypeID())
		}
		return nil
	}
	if m.Time() > b.timestamp {
		b.timestamp = m.Time()
	}
	b.lastSystemTime = time.Now()
	// Process current message
	for _, p := range b.processors {
		if rm := p.Handle(m, b.timestamp); rm != nil {
			rm.Meta().SetMeta(m.Meta())
			b.readyMsgs <- rm
		}
	}
	b.shouldEnd(m)
	return nil
}
