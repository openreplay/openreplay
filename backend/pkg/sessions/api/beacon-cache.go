package api

import (
	"sync"
	"time"
)

type BeaconSize struct {
	size int64
	time time.Time
}

type BeaconCache struct {
	mutex           *sync.RWMutex
	beaconSizeCache map[uint64]*BeaconSize
	defaultLimit    int64
}

func NewBeaconCache(limit int64) *BeaconCache {
	cache := &BeaconCache{
		mutex:           &sync.RWMutex{},
		beaconSizeCache: make(map[uint64]*BeaconSize),
		defaultLimit:    limit,
	}
	go cache.cleaner()
	return cache
}

func (e *BeaconCache) Add(sessionID uint64, size int64) {
	if size <= 0 {
		return
	}
	e.mutex.Lock()
	defer e.mutex.Unlock()
	e.beaconSizeCache[sessionID] = &BeaconSize{
		size: size,
		time: time.Now(),
	}
}

func (e *BeaconCache) Get(sessionID uint64) int64 {
	e.mutex.RLock()
	defer e.mutex.RUnlock()
	if beaconSize, ok := e.beaconSizeCache[sessionID]; ok {
		beaconSize.time = time.Now()
		return beaconSize.size
	}
	return e.defaultLimit
}

func (e *BeaconCache) cleaner() {
	for {
		time.Sleep(time.Minute * 2)
		now := time.Now()
		e.mutex.Lock()
		for sid, bs := range e.beaconSizeCache {
			if now.Sub(bs.time) > time.Minute*3 {
				delete(e.beaconSizeCache, sid)
			}
		}
		e.mutex.Unlock()
	}
}
