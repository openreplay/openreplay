package cacher

import (
	"sync"
	"time"
)

const MAX_STORAGE_TIME = 24 * time.Hour

type timeoutMap struct {
	mx sync.RWMutex
	m  map[string]time.Time
}

func newTimeoutMap() *timeoutMap {
	return &timeoutMap{
		m: make(map[string]time.Time),
	}
}

func (tm *timeoutMap) add(key string) {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	tm.m[key] = time.Now()
}

func (tm *timeoutMap) contains(key string) bool {
	tm.mx.RLock()
	defer tm.mx.RUnlock()
	_, ok := tm.m[key]
	return ok
}

func (tm *timeoutMap) delete(key string) {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	delete(tm.m, key)
}

func (tm *timeoutMap) deleteOutdated() {
	now := time.Now()
	tm.mx.Lock()
	defer tm.mx.Unlock()
	for key, t := range tm.m {
		if now.Sub(t) > MAX_STORAGE_TIME {
			delete(tm.m, key)
		}
	}
}
