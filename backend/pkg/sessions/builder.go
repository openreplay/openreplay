package sessions

import (
	"log"
	"openreplay/backend/pkg/handlers"
	"time"

	. "openreplay/backend/pkg/messages"
)

type builder struct {
	sessionID      uint64
	readyMsgs      []Message
	timestamp      uint64
	lastMessageID  uint64
	lastSystemTime time.Time
	processors     []handlers.MessageProcessor
	ended          bool
}

func NewBuilder(sessionID uint64, handlers ...handlers.MessageProcessor) *builder {
	return &builder{
		sessionID:  sessionID,
		processors: handlers,
	}
}

func (b *builder) iterateReadyMessages(iter func(msg Message)) {
	for _, readyMsg := range b.readyMsgs {
		iter(readyMsg)
	}
	b.readyMsgs = nil
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
	if m.MessageID() < b.lastMessageID {
		// May happen in case of duplicated messages in kafka (if  `idempotence: false`)
		log.Printf("skip message with wrong msgID, sessID: %d, msgID: %d, lastID: %d", b.sessionID, m.MessageID(), b.lastMessageID)
		return
	}
	timestamp := GetTimestamp(m)
	if timestamp == 0 {
		switch m.(type) {
		case *IssueEvent, *PerformanceTrackAggr:
			break
		default:
			log.Printf("skip message with empty timestamp, sessID: %d, msgID: %d, msgType: %d", b.sessionID, m.MessageID(), m.TypeID())
		}
		return
	}
	if timestamp < b.timestamp {
		//log.Printf("skip message with wrong timestamp, sessID: %d, msgID: %d, type: %d, msgTS: %d, lastTS: %d", b.sessionID, messageID, message.TypeID(), timestamp, b.timestamp)
	} else {
		b.timestamp = timestamp
	}

	b.lastSystemTime = time.Now()
	for _, p := range b.processors {
		if rm := p.Handle(m, b.timestamp); rm != nil {
			rm.Meta().SetMeta(m.Meta())
			b.readyMsgs = append(b.readyMsgs, rm)
		}
	}
	b.checkSessionEnd(m)
}
