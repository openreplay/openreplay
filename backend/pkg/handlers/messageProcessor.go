package handlers

import . "openreplay/backend/pkg/messages"

type MessageProcessor interface {
	Handle(message Message, timestamp uint64) Message
	// Build returns what is still pending, one message per call, and nil once
	// nothing is left: a flush calls it until nil.
	Build() Message
	MessageTypes() []int
}
