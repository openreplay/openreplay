package builder

import (
	"time"

	"openreplay/backend/internal/handlers"
	. "openreplay/backend/pkg/messages"
)

type builder struct {
	readyMsgs      []Message
	timestamp      uint64
	lastMessageID  uint64
	lastSystemTime time.Time
	processors     []handlers.MessageProcessor
	ended          bool
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
	if messageID < b.lastMessageID {
		// May happen in case of duplicated messages in kafka (if  `idempotence: false`)
		return
	}
	timestamp := GetTimestamp(message)
	if timestamp == 0 {
		//  May happen in case of messages that are single-in-batch,
		// 		e.g. SessionStart or RawErrorEvent (emitted by `integrations`).

		// TODO: make timestamp system transparent;
		return
	}
	if timestamp < b.timestamp {
		// Shouldn't happen after messageID check  which is done above. TODO: log this case.
		return
	}

	b.timestamp = timestamp
	b.lastSystemTime = time.Now()
	for _, p := range b.processors {
		if rm := p.Handle(message, messageID, b.timestamp); rm != nil {
			b.readyMsgs = append(b.readyMsgs, rm)
		}
	}
	b.checkSessionEnd(message)
}
