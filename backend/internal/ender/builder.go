package builder

import (
	"log"
	"openreplay/backend/pkg/intervals"
	. "openreplay/backend/pkg/messages"
)

type builder struct {
	readyMsgs []Message
	timestamp uint64
	sid       uint64
}

func NewBuilder() *builder {
	return &builder{}
}

func (b *builder) appendReadyMessage(msg Message) { // interface is never nil even if it holds nil value
	b.readyMsgs = append(b.readyMsgs, msg)
}

func (b *builder) buildSessionEnd() {
	if b.timestamp == 0 {
		return
	}
	sessionEnd := &SessionEnd{
		Timestamp: b.timestamp,
	}
	b.appendReadyMessage(sessionEnd)
}

func (b *builder) handleMessage(message Message, messageID uint64) {
	timestamp := GetTimestamp(message)
	if b.timestamp < timestamp {
		b.timestamp = timestamp
	}

	if b.timestamp == 0 {
		log.Printf("Empty timestamp, sessionID: %d, messageID: %d", b.sid, messageID)
		return
	}
}

func (b *builder) checkTimeouts(ts int64) bool {
	if b.timestamp == 0 {
		return false // There was no timestamp events yet
	}

	lastTsGap := ts - int64(b.timestamp)
	if lastTsGap > intervals.EVENTS_SESSION_END_TIMEOUT {
		b.buildSessionEnd()
		return true
	}
	return false
}
