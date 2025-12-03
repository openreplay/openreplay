package messages

import "openreplay/backend/pkg/logger"

type enderIteratorImpl struct {
	coreIterator MessageIterator
	handler      MessageHandler
	lastMessage  Message
}

func NewEnderMessageIterator(log logger.Logger, messageHandler MessageHandler, messageFilter []int, autoDecode bool) MessageIterator {
	enderIter := &enderIteratorImpl{
		handler: messageHandler,
	}
	enderIter.coreIterator = NewMessageIterator(log, enderIter.handle, messageFilter, autoDecode)
	return enderIter
}

func (e *enderIteratorImpl) handle(message Message) {
	e.lastMessage = message
}

func (e *enderIteratorImpl) Iterate(batchData []byte, batchInfo *BatchInfo) {
	// Reset last message
	e.lastMessage = nil
	// Call core iterator
	e.coreIterator.Iterate(batchData, batchInfo)
	// Call handler if last message is not nil
	if e.lastMessage != nil {
		e.handler(e.lastMessage)
	}
}
