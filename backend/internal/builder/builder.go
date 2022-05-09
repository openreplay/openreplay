package builder

import (
	"openreplay/backend/internal/handlers"
	"openreplay/backend/pkg/intervals"
	. "openreplay/backend/pkg/messages"
)

type builder struct {
	readyMsgs  []Message
	timestamp  uint64
	processors []handlers.MessageProcessor
}

func NewBuilder(handlers ...handlers.MessageProcessor) *builder {
	return &builder{
		processors: handlers,
	}
}

func (b *builder) iterateReadyMessage(iter func(msg Message)) {
	for _, readyMsg := range b.readyMsgs {
		iter(readyMsg)
	}
	b.readyMsgs = nil
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
		/* If nil is not returned explicitely by Handle, but as the typed nil
		("var i *IssueEvent; return i;")
		The `rm != nil` will be true.
		TODO: enforce nil to be nil(?) or add `isNil() bool` to the Message types
			because this part is expected to be etendable by user with custom messageProcessor's.
			Use of reflrction will be probably bad on millions of messages?
		*/
		if rm := p.Handle(message, messageID, b.timestamp); rm != nil {
			b.readyMsgs = append(b.readyMsgs, rm)
		}
	}
}

func (b *builder) checkTimeouts(ts int64) bool {
	if b.timestamp == 0 {
		return false // SessionStart happened only
	}

	lastTsGap := ts - int64(b.timestamp)
	// Maybe listen for `trigger` and react on SessionEnd instead (less reliable)
	if lastTsGap > intervals.EVENTS_SESSION_END_TIMEOUT {
		for _, p := range b.processors {
			// TODO: same as above
			if rm := p.Build(); rm != nil {
				b.readyMsgs = append(b.readyMsgs, rm)
			}
		}
		return true
	}
	return false
}
