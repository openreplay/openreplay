package service

import (
	"sync"
	"time"

	"openreplay/backend/pkg/sdk/model"
)

const memoryStateTTL = 5 * time.Minute

type memoryEntry struct {
	user    *model.User
	version uint64
	at      time.Time
}

// memoryState holds a user row for a short TTL
type memoryState struct {
	mu    sync.Mutex
	items map[string]*memoryEntry
}

func newMemoryState() *memoryState {
	return &memoryState{items: make(map[string]*memoryEntry)}
}

func (s *memoryState) load(key string) (*model.User, uint64, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.items[key]
	if !ok {
		return nil, 0, false, nil
	}
	return cloneUser(e.user), e.version, true, nil
}

func (s *memoryState) loadMany(keys []string) (map[string]*model.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make(map[string]*model.User, len(keys))
	for _, k := range keys {
		if e, ok := s.items[k]; ok {
			out[k] = cloneUser(e.user)
		}
	}
	return out, nil
}

func (s *memoryState) create(key string, user *model.User) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.items[key]; ok {
		return false, nil
	}
	s.items[key] = &memoryEntry{user: cloneUser(user), at: time.Now()}
	return true, nil
}

func (s *memoryState) store(key string, user *model.User, version uint64) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.items[key]
	if !ok || e.version != version {
		return false, nil
	}
	e.user = cloneUser(user)
	e.version++
	e.at = time.Now()
	return true, nil
}

func (s *memoryState) delete(key string) error {
	s.mu.Lock()
	delete(s.items, key)
	s.mu.Unlock()
	return nil
}

func (s *memoryState) sweep(now time.Time) {
	s.mu.Lock()
	for k, e := range s.items {
		if now.Sub(e.at) > memoryStateTTL {
			delete(s.items, k)
		}
	}
	s.mu.Unlock()
}

func (s *memoryState) sweeper() {
	for now := range time.Tick(time.Minute) {
		s.sweep(now)
	}
}
