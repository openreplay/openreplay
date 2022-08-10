package queue

import (
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/redisstream"
)

func NewConsumer(group string, topics []string, handler types.MessageHandler, _ bool, _ int) types.Consumer {
	return redisstream.NewConsumer(group, topics, handler)
}

func NewProducer(_ int, _ bool) types.Producer {
	return redisstream.NewProducer()
}
