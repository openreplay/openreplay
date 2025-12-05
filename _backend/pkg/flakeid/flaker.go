package flakeid

import (
	"errors"
	"sync"
)

type Flaker struct {
	shardID  uint16
	seqID    uint8
	seqMutex *sync.Mutex
}

func NewFlaker(shardID uint16) *Flaker {
	return &Flaker{
		shardID:  shardID,
		seqID:    0,
		seqMutex: &sync.Mutex{},
	}
}

func (flaker *Flaker) nextSeqID() uint8 {
	flaker.seqMutex.Lock()
	defer flaker.seqMutex.Unlock()
	seqID := flaker.seqID
	if seqID == SEQ_ID_MAX {
		flaker.seqID = 0
	} else {
		flaker.seqID = seqID + 1
	}
	return seqID
}

func (flaker *Flaker) Compose(timestamp uint64) (uint64, error) {
	if timestamp <= EPOCH {
		return 0, errors.New("epoch is not in the past")
	}
	timestamp -= EPOCH
	if timestamp > TIMESTAMP_MAX {
		return 0, errors.New("epoch is too small")
	}
	return compose(timestamp, flaker.shardID, flaker.nextSeqID()), nil
}

func ExtractTimestamp(id uint64) uint64 {
	return extractTimestamp(id) + EPOCH
}
