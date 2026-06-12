package messages

import "time"

type pageLocations struct {
	urls map[uint64]string
}

func NewPageLocations() *pageLocations {
	return &pageLocations{urls: make(map[uint64]string)}
}

func (p *pageLocations) Set(sessID uint64, url string) {
	p.urls[sessID] = url
}

func (p *pageLocations) Get(sessID uint64) string {
	url := p.urls[sessID]
	return url
}

func (p *pageLocations) Delete(sessID uint64) {
	delete(p.urls, sessID)
}

const (
	brokenBatchTTL           = 2 * time.Hour
	brokenBatchSweepInterval = time.Minute
)

type brokenBatchEntry struct {
	count     int
	createdAt time.Time
}

type brokenBatches struct {
	entries   map[uint64]*brokenBatchEntry
	lastSweep time.Time
}

func NewBrokenBatches() *brokenBatches {
	return &brokenBatches{entries: make(map[uint64]*brokenBatchEntry)}
}

func (b *brokenBatches) Inc(sessID uint64) int {
	now := time.Now()
	b.evictExpired(now)
	e, ok := b.entries[sessID]
	if !ok {
		e = &brokenBatchEntry{createdAt: now}
		b.entries[sessID] = e
	}
	e.count++
	return e.count
}

func (b *brokenBatches) Pop(sessID uint64) (count int, ok bool) {
	now := time.Now()
	b.evictExpired(now)
	e, ok := b.entries[sessID]
	if !ok {
		return 0, false
	}
	delete(b.entries, sessID)
	return e.count, true
}

func (b *brokenBatches) evictExpired(now time.Time) {
	if now.Sub(b.lastSweep) < brokenBatchSweepInterval {
		return
	}
	b.lastSweep = now
	for sessID, e := range b.entries {
		if now.Sub(e.createdAt) > brokenBatchTTL {
			delete(b.entries, sessID)
		}
	}
}
