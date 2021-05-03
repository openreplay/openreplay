package kafka

import "encoding/binary"

const PARTITIONS_EXPONENT = 3
const PARTITIONS_MAX_INDEX uint64 = 1<<PARTITIONS_EXPONENT - 1

func getKeyPartition(key uint64) int32 {
	return int32(key & PARTITIONS_MAX_INDEX)
}

func encodeKey(key uint64) []byte {
	buf := make([]byte, 8)
	binary.LittleEndian.PutUint64(buf, key)
	return buf
}

func decodeKey(key []byte) uint64 {
	return binary.LittleEndian.Uint64(key)
}
