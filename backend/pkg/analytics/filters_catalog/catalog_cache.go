package filters_catalog

import (
	"fmt"
	"sync"
	"time"

	"openreplay/backend/pkg/analytics/filters_catalog/model"
)

const catalogCacheTTL = 120 * time.Second

// catalogCache caches the CH-backed events and properties catalog sections
// per project (events additionally per platform). Segments, features, and
// metadata are intentionally not cached here — they must stay live.
type catalogCache struct {
	mu  sync.RWMutex
	ttl time.Duration
	m   map[string]cachedSection
}

type cachedSection struct {
	section model.FilterSection
	expires time.Time
}

func newCatalogCache(ttl time.Duration) *catalogCache {
	c := &catalogCache{ttl: ttl, m: make(map[string]cachedSection)}
	go c.cleaner()
	return c
}

func (c *catalogCache) get(key string) (model.FilterSection, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.m[key]
	if !ok || time.Now().After(e.expires) {
		return model.FilterSection{}, false
	}
	return e.section, true
}

func (c *catalogCache) set(key string, section model.FilterSection) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = cachedSection{section: section, expires: time.Now().Add(c.ttl)}
}

func (c *catalogCache) invalidate(projectID uint32) {
	prefix := fmt.Sprintf("%d:", projectID)
	c.mu.Lock()
	defer c.mu.Unlock()
	for k := range c.m {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(c.m, k)
		}
	}
}

func (c *catalogCache) cleaner() {
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

func eventsCatalogCacheKey(projectID uint32, platform string) string {
	return fmt.Sprintf("%d:events:%s", projectID, platform)
}

func propertiesCatalogCacheKey(projectID uint32) string {
	return fmt.Sprintf("%d:properties", projectID)
}
