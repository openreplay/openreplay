package queue

import (
	"openreplay/backend/pkg/kafka"
	"openreplay/backend/pkg/license"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
)

func NewConsumer(log logger.Logger, string, topics []string, iterator messages.MessageIterator, autoCommit bool, messageSizeLimit int, rebalanceHandler types.RebalanceHandler) (types.Consumer, error) {
	license.CheckLicense()
	return kafka.NewConsumer(log, group, topics, iterator, autoCommit, messageSizeLimit, rebalanceHandler)
}

func NewProducer(messageSizeLimit int, useBatch bool) types.Producer {
	license.CheckLicense()
	return kafka.NewProducer(messageSizeLimit, useBatch)
}
