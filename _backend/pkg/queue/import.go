package queue

import (
	"time"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/redisstream"
)

func NewConsumer(log logger.Logger, group string, topics []string, iterator messages.MessageIterator, _ bool, _ int, _ types.RebalanceHandler, _ time.Duration) (types.Consumer, error) {
	return redisstream.NewConsumer(group, topics, iterator)
}

func NewProducer(_ int, _ bool) types.Producer {
	return redisstream.NewProducer()
}
