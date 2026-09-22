package messages

import "time"

const (
	pageTitleTTL           = 2 * time.Hour
	pageTitleEndedGrace    = 10 * time.Minute
	pageTitleSweepInterval = time.Minute
)

type pageTitleEntry struct {
	last     string
	byURL    map[string]string
	lastSeen time.Time
	endedAt  time.Time
}

type pageTitles struct {
	entries   map[uint64]*pageTitleEntry
	lastSweep time.Time
}

func NewPageTitles() *pageTitles {
	return &pageTitles{entries: make(map[uint64]*pageTitleEntry)}
}

func (p *pageTitles) Set(sessID uint64, url, title string) {
	now := time.Now()
	p.evictExpired(now)
	e, ok := p.entries[sessID]
	if !ok {
		e = &pageTitleEntry{byURL: make(map[string]string)}
		p.entries[sessID] = e
	}
	e.lastSeen = now
	e.last = title
	if title != "" && url != "" {
		e.byURL[url] = title
	}
}

func (p *pageTitles) Last(sessID uint64) string {
	e, ok := p.entries[sessID]
	if !ok {
		return ""
	}
	return e.last
}

func (p *pageTitles) ForURL(sessID uint64, url string) string {
	e, ok := p.entries[sessID]
	if !ok {
		return ""
	}
	if t, ok := e.byURL[url]; ok {
		return t
	}
	return e.last
}

func (p *pageTitles) End(sessID uint64) {
	if e, ok := p.entries[sessID]; ok && e.endedAt.IsZero() {
		e.endedAt = time.Now()
	}
}

func (p *pageTitles) evictExpired(now time.Time) {
	if now.Sub(p.lastSweep) < pageTitleSweepInterval {
		return
	}
	p.lastSweep = now
	for sessID, e := range p.entries {
		if !e.endedAt.IsZero() && now.Sub(e.endedAt) > pageTitleEndedGrace {
			delete(p.entries, sessID)
			continue
		}
		if now.Sub(e.lastSeen) > pageTitleTTL {
			delete(p.entries, sessID)
		}
	}
}

const (
	brokenBatchTTL           = 2 * time.Hour
	brokenBatchSweepInterval = time.Minute
)

type brokenBatchEntry struct {
	count     int
	firstErr  string
	createdAt time.Time
}

type brokenBatches struct {
	entries   map[uint64]*brokenBatchEntry
	lastSweep time.Time
}

func NewBrokenBatches() *brokenBatches {
	return &brokenBatches{entries: make(map[uint64]*brokenBatchEntry)}
}

func (b *brokenBatches) Inc(sessID uint64, errMsg string) int {
	now := time.Now()
	b.evictExpired(now)
	e, ok := b.entries[sessID]
	if !ok {
		e = &brokenBatchEntry{createdAt: now, firstErr: errMsg}
		b.entries[sessID] = e
	}
	e.count++
	return e.count
}

func (b *brokenBatches) Pop(sessID uint64) (count int, firstErr string, ok bool) {
	now := time.Now()
	b.evictExpired(now)
	e, ok := b.entries[sessID]
	if !ok {
		return 0, "", false
	}
	delete(b.entries, sessID)
	return e.count, e.firstErr, true
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
