package sessionwriter

import (
	"math"
	"sync"
	"time"
)

type Meta struct {
	limit int
	lock  *sync.Mutex
	meta  map[uint64]int64
}

func NewMeta(limit int) *Meta {
	return &Meta{
		limit: limit,
		lock:  &sync.Mutex{},
		meta:  make(map[uint64]int64, limit),
	}
}

func (m *Meta) Add(sid uint64) {
	m.lock.Lock()
	m.meta[sid] = time.Now().Unix()
	m.lock.Unlock()
}

func (m *Meta) Count() int {
	m.lock.Lock()
	defer m.lock.Unlock()
	return len(m.meta)
}

func (m *Meta) Delete(sid uint64) {
	m.lock.Lock()
	delete(m.meta, sid)
	m.lock.Unlock()
}

func (m *Meta) GetExtra() uint64 {
	m.lock.Lock()
	defer m.lock.Unlock()
	if len(m.meta) >= m.limit {
		var extraSessID uint64
		var minTimestamp int64 = math.MaxInt64
		for sessID, timestamp := range m.meta {
			if timestamp < minTimestamp {
				extraSessID = sessID
				minTimestamp = timestamp
			}
		}
		return extraSessID
	}
	return 0
}
