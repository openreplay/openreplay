package builders

import (
	"fmt"
	"time"

	"openreplay/backend/pkg/handlers"
	. "openreplay/backend/pkg/messages"
)

type builder struct {
	sessionID      uint64
	readyMsgs      chan Message
	timestamp      uint64
	lastMessageID  uint64
	lastSystemTime time.Time
	processors     []handlers.MessageProcessor
	ended          bool
}

func NewBuilder(sessionID uint64, events chan Message, handlers ...handlers.MessageProcessor) *builder {
	return &builder{
		sessionID:  sessionID,
		processors: handlers,
		readyMsgs:  events,
	}
}

func (b *builder) checkSessionEnd(message Message) {
	if _, isEnd := message.(*MobileSessionEnd); isEnd {
		b.ended = true
	}
	if _, isEnd := message.(*SessionEnd); isEnd {
		b.ended = true
	}
}

func (b *builder) handleMessage(m Message) error {
	if m.MsgID() < b.lastMessageID {
		// May happen in case of duplicated messages in kafka (if  `idempotence: false`)
		return fmt.Errorf("skip message with wrong msgID: %d, lastID: %d", m.MsgID(), b.lastMessageID)
	}
	if m.Time() <= 0 {
		switch m.(type) {
		case *IssueEvent, *PerformanceTrackAggr:
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
	b.checkSessionEnd(m)
	return nil
}
