package cacher

import (
	"sync"
	"time"
)

const MAX_STORAGE_TIME = 24 * time.Hour

const inFlightStaleAfter = 1 * time.Hour

type timeoutMap struct {
	mx        sync.Mutex
	completed map[string]time.Time
	inFlight  map[string]time.Time
}

func newTimeoutMap() *timeoutMap {
	return &timeoutMap{
		completed: make(map[string]time.Time),
		inFlight:  make(map[string]time.Time),
	}
}

func (tm *timeoutMap) reserve(key string) bool {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	if _, ok := tm.inFlight[key]; ok {
		return false
	}
	if _, ok := tm.completed[key]; ok {
		return false
	}
	tm.inFlight[key] = time.Now()
	return true
}

func (tm *timeoutMap) markCompleted(key string) {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	delete(tm.inFlight, key)
	tm.completed[key] = time.Now()
}

func (tm *timeoutMap) markFailed(key string) {
	tm.mx.Lock()
	defer tm.mx.Unlock()
	delete(tm.inFlight, key)
}

func (tm *timeoutMap) deleteOutdated() {
	now := time.Now()
	tm.mx.Lock()
	defer tm.mx.Unlock()
	for key, t := range tm.completed {
		if now.Sub(t) > MAX_STORAGE_TIME {
			delete(tm.completed, key)
		}
	}
	for key, t := range tm.inFlight {
		if now.Sub(t) > inFlightStaleAfter {
			delete(tm.inFlight, key)
		}
	}
}
