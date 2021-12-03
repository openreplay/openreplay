package messages

import (
	"io"
	"bytes"

	"github.com/pkg/errors"
)

func ReadBatch(b []byte, callback func(Message)) error {
	reader :=	bytes.NewReader(b)
	var index uint64
	var timestamp int64
	for {
		msg, err := ReadMessage(reader)
		if err == io.EOF {
			return nil
		} else if err != nil {
			return errors.Wrapf(err, "Batch Message decoding error on message with index %v", index)
		}
		msg = transformDepricated(msg)

		isBatchMeta := false
		switch m := msg.(type){
		case *BatchMeta:  // Is not required to be present in batch since IOS doesn't have it (though we might change it)
			if index != 0 { // Might be several 0-0 BatchMeta in a row without a error though
				return errors.New("Batch Meta found at the end of the batch")
			}
			index = m.PageNo << 32 + m.FirstIndex // 2^32  is the maximum count of messages per page (ha-ha)
			timestamp = m.Timestamp
			isBatchMeta = true
			// continue readLoop
		case *IOSBatchMeta:
			if index != 0 { // Might be several 0-0 BatchMeta in a row without a error though
				return errors.New("Batch Meta found at the end of the batch")
			}
			index =  m.FirstIndex
			timestamp = int64(m.Timestamp)
			isBatchMeta = true
			// continue readLoop
		case *Timestamp:
			timestamp = int64(m.Timestamp) // TODO(?): replace timestamp type to int64 everywhere (including encoding part in tracker)
			// No skipping here for making it easy to encode back the same sequence of message
			// continue readLoop
		}
		msg.Meta().Index = index
		msg.Meta().Timestamp = timestamp
		callback(msg)
		if !isBatchMeta {  // Without that indexes will be unique anyway, though shifted by 1 because BatchMeta is not counted in tracker
			index++
		}
	}
	return errors.New("Error of the codeflow. (Should return on EOF)")
}

const AVG_MESSAGE_SIZE = 40 // TODO: calculate OR calculate dynamically 
func WriteBatch(mList []Message) []byte {
	batch := make([]byte, AVG_MESSAGE_SIZE * len(mList))
	p := 0
	for _, msg := range mList {
		msgBytes := msg.Encode()
		if len(batch) < p + len(msgBytes) {
			newBatch := make([]byte, 2*len(batch) + len(msgBytes))
      copy(newBatch, batch)
      batch = newBatch
		}
		copy(batch[p:], msgBytes)
		p += len(msgBytes)
	}
	return batch[:p]
}

func RewriteBatch(b []byte, rewrite func(Message) Message) ([]byte, error) {
	mList := make([]Message, 0, len(b)/AVG_MESSAGE_SIZE)
	if err := ReadBatch(b, func(m Message) {
		mList = append(mList, rewrite(m))
	}); err != nil {
		return nil, err
	}
	return WriteBatch(mList), nil
}