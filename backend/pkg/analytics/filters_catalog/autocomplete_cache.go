package filters_catalog

import (
	"sync"
	"time"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

type autocompleteCache struct {
	mu  sync.RWMutex
	ttl time.Duration
	m   map[string]cachedRows
}

type cachedRows struct {
	rows    []model.AutocompleteRow
	expires time.Time
}

func newAutocompleteCache(ttl time.Duration) *autocompleteCache {
	c := &autocompleteCache{ttl: ttl, m: make(map[string]cachedRows)}
	go c.cleaner()
	return c
}

func (c *autocompleteCache) get(key string) ([]model.AutocompleteRow, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.m[key]
	if !ok || time.Now().After(e.expires) {
		return nil, false
	}
	return e.rows, true
}

func (c *autocompleteCache) set(key string, rows []model.AutocompleteRow) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = cachedRows{rows: rows, expires: time.Now().Add(c.ttl)}
}

func (c *autocompleteCache) cleaner() {
	for {
		time.Sleep(c.ttl)
		now := time.Now()
		c.mu.Lock()
		for k, e := range c.m {
			if now.After(e.expires) {
				delete(c.m, k)
			}
		}
		c.mu.Unlock()
	}
}
