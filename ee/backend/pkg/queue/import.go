package queue

import (
	"openreplay/backend/pkg/kafka"
	"openreplay/backend/pkg/license"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)

func NewConsumer(group string, topics []string, iterator messages.MessageIterator, autoCommit bool, messageSizeLimit int) types.Consumer {
	license.CheckLicense()
	return kafka.NewConsumer(group, topics, iterator, autoCommit, messageSizeLimit)
}

func NewProducer(messageSizeLimit int, useBatch bool) types.Producer {
	license.CheckLicense()
	return kafka.NewProducer(messageSizeLimit, useBatch)
}
