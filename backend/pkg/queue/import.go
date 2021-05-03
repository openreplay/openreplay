package queue

import (
	"openreplay/backend/pkg/redisstream"
	"openreplay/backend/pkg/queue/types"
)

func NewConsumer(group string, topics []string, handler types.MessageHandler) types.Consumer {
	return redisstream.NewConsumer(group, topics, handler)
}

func NewProducer() types.Producer {
	return redisstream.NewProducer()
}

