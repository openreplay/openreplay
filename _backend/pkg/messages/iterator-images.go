package messages

type imagesIteratorImpl struct {
	coreIterator MessageIterator
	handler      ImageMessageHandler
}

type ImageMessageHandler func(data []byte, sessID uint64)

func NewImagesMessageIterator(messageHandler ImageMessageHandler, messageFilter []int, autoDecode bool) MessageIterator {
	enderIter := &imagesIteratorImpl{
		handler: messageHandler,
	}
	//enderIter.coreIterator = NewMessageIterator(enderIter.handle, messageFilter, autoDecode)
	return enderIter
}

func (e *imagesIteratorImpl) handle(message Message) {
	//
}

func (e *imagesIteratorImpl) Iterate(batchData []byte, batchInfo *BatchInfo) {
	e.handler(batchData, batchInfo.sessionID)
}
