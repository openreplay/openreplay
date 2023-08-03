package types

type RebalanceType string

const (
	RebalanceTypeAssign RebalanceType = "assign"
	RebalanceTypeRevoke RebalanceType = "revoke"
)

type PartitionsRebalancedEvent struct {
	Type       RebalanceType
	Partitions []uint64
}

// Consumer reads batches of session data from queue (redis or kafka)
type Consumer interface {
	ConsumeNext() error
	CommitBack(gap int64) error
	Commit() error
	Close()
	Rebalanced() <-chan *PartitionsRebalancedEvent
}

// Producer sends batches of session data to queue (redis or kafka)
type Producer interface {
	Produce(topic string, key uint64, value []byte) error
	ProduceToPartition(topic string, partition, key uint64, value []byte) error
	Flush(timeout int)
	Close(timeout int)
}
