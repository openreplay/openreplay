package queue

import (
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/redisstream"
)

func NewConsumer(group string, topics []string, handler types.MessageHandler, _ bool) types.Consumer {
	return redisstream.NewConsumer(group, topics, handler)
}

func NewProducer() types.Producer {
	return redisstream.NewProducer()
}
