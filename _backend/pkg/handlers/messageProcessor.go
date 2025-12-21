package handlers

import . "openreplay/backend/pkg/messages"

// Heuristic interface - common interface for user's realisations
// U can create your own message handler and easily connect to heuristics service

type MessageProcessor interface {
	Handle(message Message, timestamp uint64) Message
	Build() Message
}
