package messages

import (
	"openreplay/backend/pkg/metrics/sink"
)

type sinkIteratorImpl struct {
	coreIterator MessageIterator
	handler      MessageHandler
}

func NewSinkMessageIterator(messageHandler MessageHandler, messageFilter []int, autoDecode bool) MessageIterator {
	iter := &sinkIteratorImpl{
		handler: messageHandler,
	}
	iter.coreIterator = NewMessageIterator(iter.handle, messageFilter, autoDecode)
	return iter
}

func (i *sinkIteratorImpl) handle(message Message) {
	i.handler(message)
}

func (i *sinkIteratorImpl) Iterate(batchData []byte, batchInfo *BatchInfo) {
	sink.RecordBatchSize(float64(len(batchData)))
	sink.IncreaseTotalBatches()
	// Call core iterator
	i.coreIterator.Iterate(batchData, batchInfo)
	// Send batch end signal
	i.handler(nil)
}
