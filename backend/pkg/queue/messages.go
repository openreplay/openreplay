package queue

import (
	"log"

	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)


func NewMessageConsumer(group string, topics []string, handler types.DecodedMessageHandler) types.Consumer {
	return NewConsumer(group, topics, func(sessionID uint64, value []byte, meta *types.Meta) {
		if err := messages.ReadBatch(value, func(msg messages.Message) {
			handler(sessionID, msg, meta)
		}); err != nil {
			log.Printf("Decode error: %v\n", err)
		}
	})
}
