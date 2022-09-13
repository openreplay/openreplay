package types

import (
	"openreplay/backend/pkg/messages"
)

type Consumer interface {
	ConsumeNext() error
	Commit() error
	CommitBack(gap int64) error
	Close()
	HasFirstPartition() bool
}

type Producer interface {
	Produce(topic string, key uint64, value []byte) error
	ProduceToPartition(topic string, partition, key uint64, value []byte) error
	Close(timeout int)
	Flush(timeout int)
}

type Meta struct {
	ID        uint64
	Topic     string
	Timestamp int64
}

type MessageHandler func(uint64, []byte, *Meta)
type DecodedMessageHandler func(uint64, messages.Message, *Meta)
type RawMessageHandler func(uint64, messages.Iterator, *Meta)
