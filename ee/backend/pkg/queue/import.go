package queue

import (
	"openreplay/backend/pkg/kafka"
	"openreplay/backend/pkg/license"
	"openreplay/backend/pkg/queue/types"
)

func NewConsumer(group string, topics []string, handler types.MessageHandler, autoCommit bool) types.Consumer {
	license.CheckLicense()
	return kafka.NewConsumer(group, topics, handler, autoCommit)
}

func NewProducer() types.Producer {
	license.CheckLicense()
	return kafka.NewProducer()
}
