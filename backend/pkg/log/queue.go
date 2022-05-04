package log

import (
	"fmt"
	"log"
	"time"

	"openreplay/backend/pkg/queue/types"
	//"openreplay/backend/pkg/env"
)

type partitionStats struct {
	maxts  int64
	mints  int64
	lastts int64
	lastID uint64
	count  int
}

// Update partition statistic
func (prt *partitionStats) update(m *types.Meta) {
	if prt.maxts < m.Timestamp {
		prt.maxts = m.Timestamp
	}
	if prt.mints > m.Timestamp || prt.mints == 0 {
		prt.mints = m.Timestamp
	}
	prt.lastts = m.Timestamp
	prt.lastID = m.ID
	prt.count += 1
}

type queueStats struct {
	prts map[int32]*partitionStats
	tick <-chan time.Time
}

func NewQueueStats(sec int) *queueStats {
	return &queueStats{
		prts: make(map[int32]*partitionStats),
		tick: time.Tick(time.Duration(sec) * time.Second),
	}
}

// Collect writes new data to partition statistic
func (qs *queueStats) Collect(sessionID uint64, m *types.Meta) {
	prti := int32(sessionID % 16) // TODO use GetKeyPartition from kafka/key.go
	prt, ok := qs.prts[prti]
	if !ok {
		qs.prts[prti] = &partitionStats{}
		prt = qs.prts[prti]
	}
	prt.update(m)

	select {
	case <-qs.tick:
		qs.log()
		qs.reset()
	default:
	}
}

// Print to console collected statistics
func (qs *queueStats) log() {
	s := "Queue Statistics: "
	for i, p := range qs.prts {
		s = fmt.Sprintf("%v | %v:: lastTS %v, lastID %v, count %v, maxTS %v, minTS %v",
			s, i, p.lastts, p.lastID, p.count, p.maxts, p.mints)
	}
	log.Println(s)
}

// Clear all queue partitions
func (qs *queueStats) reset() {
	qs.prts = make(map[int32]*partitionStats)
}
