package queue

import (
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/redisstream"
)

func NewConsumer(group string, topics []string, iterator messages.MessageIterator, _ bool, _ int) types.Consumer {
	return redisstream.NewConsumer(group, topics, iterator)
}

func NewProducer(_ int, _ bool) types.Producer {
	return redisstream.NewProducer()
}
