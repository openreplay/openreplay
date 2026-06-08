package cacher

import (
	"sync"
	"time"
)

const MAX_STORAGE_TIME = 24 * time.Hour

type timeoutMap struct {
	mx sync.RWMutex
	m  map[string]time.Time // key -> expiry time
}

func newTimeoutMap() *timeoutMap {
	return &timeoutMap{
		m: make(map[string]time.Time),
	}
}

func (tm *timeoutMap) add(key string) {
	tm.addFor(key, MAX_STORAGE_TIME)
}

func (tm *timeoutMap) addFor(key string, ttl time.Duration) {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	tm.m[key] = time.Now().Add(ttl)
}

func (tm *timeoutMap) contains(key string) bool {
	tm.mx.RLock()
	defer tm.mx.RUnlock()
	exp, ok := tm.m[key]
	return ok && time.Now().Before(exp)
}

func (tm *timeoutMap) deleteOutdated() {
	now := time.Now()
	tm.mx.Lock()
	defer tm.mx.Unlock()
	for key, exp := range tm.m {
		if now.After(exp) {
			delete(tm.m, key)
		}
	}
}
