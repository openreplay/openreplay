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

func (tm *timeoutMap) addFor(key string, ttl time.Duration) {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	tm.m[key] = time.Now().Add(ttl)
}

func (tm *timeoutMap) claim(key string) bool {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	if exp, ok := tm.m[key]; ok && time.Now().Before(exp) {
		return false
	}
	tm.m[key] = time.Now().Add(MAX_STORAGE_TIME)
	return true
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
	for key, exp := range tm.m {
		if now.After(exp) {
			delete(tm.m, key)
		}
	}
}
