package cacher

import "sync"

type hostLimiter struct {
	mu       sync.Mutex
	inflight map[string]int
	limit    int
}

func newHostLimiter(limit int) *hostLimiter {
	return &hostLimiter{
		inflight: make(map[string]int),
		limit:    limit,
	}
}

func (l *hostLimiter) tryAcquire(host string) bool {
	if l.limit <= 0 {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.inflight[host] >= l.limit {
		return false
	}
	l.inflight[host]++
	return true
}

func (l *hostLimiter) release(host string) {
	if l.limit <= 0 {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.inflight[host]--
	if l.inflight[host] <= 0 {
		delete(l.inflight, host) // keep the map bounded to currently-active hosts
	}
}
