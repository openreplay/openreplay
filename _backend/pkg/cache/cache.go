package cache

import (
	"sync"
	"time"
)

type Cache interface {
	Set(key, value interface{})
	Get(key interface{}) (interface{}, bool)
	GetAndRefresh(key interface{}) (interface{}, bool)
	SetCache(sessID uint64, data map[string]string) error
	GetCache(sessID uint64) (map[string]string, error)
}

type item struct {
	data      interface{}
	lastUsage time.Time
}

type cacheImpl struct {
	mutex sync.Mutex
	items map[interface{}]item
}

func (c *cacheImpl) SetCache(sessID uint64, data map[string]string) error {
	return nil
}

func (c *cacheImpl) GetCache(sessID uint64) (map[string]string, error) {
	return nil, nil
}

func New(cleaningInterval, itemDuration time.Duration) Cache {
	cache := &cacheImpl{items: make(map[interface{}]item)}
	go func() {
		cleanTick := time.Tick(cleaningInterval)
		for {
			select {
			case <-cleanTick:
				cache.mutex.Lock()
				now := time.Now()
				for k, v := range cache.items {
					if now.Sub(v.lastUsage) > itemDuration {
						delete(cache.items, k)
					}
				}
				cache.mutex.Unlock()
			}
		}
	}()
	return cache
}

func (c *cacheImpl) Set(key, value interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.items[key] = item{
		data:      value,
		lastUsage: time.Now(),
	}
}

func (c *cacheImpl) Get(key interface{}) (interface{}, bool) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	if v, ok := c.items[key]; ok {
		return v.data, ok
	}
	return nil, false
}

func (c *cacheImpl) GetAndRefresh(key interface{}) (interface{}, bool) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	v, ok := c.items[key]
	if ok {
		v.lastUsage = time.Now()
		c.items[key] = v
	}
	return v.data, ok
}
