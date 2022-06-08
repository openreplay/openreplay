package handlers

import . "openreplay/backend/pkg/messages"

// Heuristic interface - common interface for user's realisations
// U can create your own message handler and easily connect to heuristics service

type MessageProcessor interface {
	Handle(message Message, messageID uint64, timestamp uint64) Message
	Build() Message
}
