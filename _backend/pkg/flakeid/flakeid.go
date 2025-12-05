package flakeid

const (
	SEQ_ID_SIZE     = 8
	SHARD_ID_SIZE   = 16
	TIMESTAMP_SIZE  = 64 - SEQ_ID_SIZE - SHARD_ID_SIZE
	SEQ_ID_MAX      = 1<<SEQ_ID_SIZE - 1
	TIMESTAMP_MAX   = 1<<TIMESTAMP_SIZE - 1 // 30 years from EPOCH date
	TIMESTAMP_SHIFT = SEQ_ID_SIZE + SHARD_ID_SIZE
	SHARD_ID_SHIFT  = SEQ_ID_SIZE
	EPOCH           = 1550000000000 // Tue Feb 12 2019 19:33:20 GMT+0000
)

func compose(timestamp uint64, shardID uint16, seqID byte) uint64 {
	return (timestamp << TIMESTAMP_SHIFT) | (uint64(shardID) << SHARD_ID_SHIFT) | uint64(seqID)
}

func extractTimestamp(id uint64) uint64 {
	return id >> TIMESTAMP_SHIFT
}
