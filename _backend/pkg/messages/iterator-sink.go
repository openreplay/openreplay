package messages

import (
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/sink"
)

type sinkIteratorImpl struct {
	coreIterator MessageIterator
	handler      MessageHandler
	metrics      sink.Sink
}

func NewSinkMessageIterator(log logger.Logger, messageHandler MessageHandler, messageFilter []int, autoDecode bool, metrics sink.Sink) MessageIterator {
	iter := &sinkIteratorImpl{
		handler: messageHandler,
		metrics: metrics,
	}
	iter.coreIterator = NewMessageIterator(log, iter.handle, messageFilter, autoDecode)
	return iter
}

func (i *sinkIteratorImpl) handle(message Message) {
	i.handler(message)
}

func (i *sinkIteratorImpl) Iterate(batchData []byte, batchInfo *BatchInfo) {
	i.metrics.RecordBatchSize(float64(len(batchData)))
	i.metrics.IncreaseTotalBatches()
	// Call core iterator
	i.coreIterator.Iterate(batchData, batchInfo)
	// Send batch end signal
	i.handler(nil)
}
