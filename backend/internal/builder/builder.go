package builder

import (
	"openreplay/backend/internal/handlers"
	. "openreplay/backend/pkg/messages"
)

type builder struct {
	readyMsgs  []Message
	timestamp  uint64
	processors []handlers.MessageProcessor
	ended      bool
}

func NewBuilder(handlers ...handlers.MessageProcessor) *builder {
	return &builder{
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

func (b *builder) handleMessage(message Message, messageID uint64) {
	timestamp := GetTimestamp(message)
	if b.timestamp < timestamp {
		b.timestamp = timestamp
	}
	if b.timestamp == 0 {
		// in case of SessionStart. TODO: make timestamp system transparent
		return
	}

	for _, p := range b.processors {
		if rm := p.Handle(message, messageID, b.timestamp); rm != nil {
			b.readyMsgs = append(b.readyMsgs, rm)
		}
	}
	b.checkSessionEnd(message)
}
