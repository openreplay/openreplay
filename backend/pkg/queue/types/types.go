package types

type RebalanceType int

const (
	RebalanceTypeAssign RebalanceType = iota
	RebalanceTypeRevoke
)

type RebalanceHandler func(t RebalanceType, partitions []uint64)

type PartitionsRebalancedEvent struct {
	Type       RebalanceType
	Partitions []uint64
}

const (
	NoReadBackGap = 0
)

// Consumer reads batches of session data from queue (redis or kafka)
type Consumer interface {
	ConsumeNext() error
	CommitBack(gap int64) error
	Commit() error
	Close()
}

// Producer sends batches of session data to queue (redis or kafka)
type Producer interface {
	Produce(topic string, key uint64, value []byte) error
	ProduceToPartition(topic string, partition, key uint64, value []byte) error
	Flush(timeout int)
	Close(timeout int)
}
