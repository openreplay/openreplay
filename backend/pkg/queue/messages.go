package queue

import (
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)

func NewMessageConsumer(group string, topics []string, handler types.RawMessageHandler, autoCommit bool, messageSizeLimit int) types.Consumer {
	return NewConsumer(group, topics, func(sessionID uint64, value []byte, meta *types.Meta) {
		handler(sessionID, messages.NewIterator(value), meta)
	}, autoCommit, messageSizeLimit)
}
