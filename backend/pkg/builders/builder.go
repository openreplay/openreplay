package builders

import (
	"log"
	"openreplay/backend/pkg/handlers"
	"time"

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
	if _, isEnd := message.(*IOSSessionEnd); isEnd {
		b.ended = true
	}
	if _, isEnd := message.(*SessionEnd); isEnd {
		b.ended = true
	}
}

func (b *builder) handleMessage(m Message) {
	if m.MsgID() < b.lastMessageID {
		// May happen in case of duplicated messages in kafka (if  `idempotence: false`)
		log.Printf("skip message with wrong msgID, sessID: %d, msgID: %d, lastID: %d", b.sessionID, m.MsgID(), b.lastMessageID)
		return
	}
	if m.Time() <= 0 {
		switch m.(type) {
		case *IssueEvent, *PerformanceTrackAggr:
			break
		default:
			log.Printf("skip message with incorrect timestamp, sessID: %d, msgID: %d, msgType: %d", b.sessionID, m.MsgID(), m.TypeID())
		}
		return
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
}
