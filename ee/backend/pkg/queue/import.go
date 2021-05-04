package queue

import (
	"openreplay/backend/pkg/kafka"
	"openreplay/backend/pkg/queue/types"
)

func NewConsumer(group string, topics []string, handler types.MessageHandler) types.Consumer {
	return kafka.NewConsumer(group, topics, handler)
}

func NewProducer() types.Producer {
	return kafka.NewProducer()
}

