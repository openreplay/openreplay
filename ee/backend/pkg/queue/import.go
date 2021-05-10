package queue

import (
	"openreplay/backend/pkg/kafka"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/license"
)

func NewConsumer(group string, topics []string, handler types.MessageHandler) types.Consumer {
	license.CheckLicense()
	return kafka.NewConsumer(group, topics, handler)
}

func NewProducer() types.Producer {
	license.CheckLicense()
	return kafka.NewProducer()
}

