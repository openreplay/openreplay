package issues

import (
	"context"
	"errors"
	"sync"
	"time"

	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
)

type Issues interface {
	Add(sessionID uint64, issueType string) error
	Get(sessionID uint64) ([]string, error)
	Flush() error
}

type issuesImpl struct {
	log   logger.Logger
	store Issues
}

const (
	defaultTTL           = 3 * time.Hour
	defaultGCInterval    = 5 * time.Minute
	defaultFlushInterval = time.Second
	redisKeyPrefix       = "issues:"
)

func New(log logger.Logger, r *redis.Client, flushInterval time.Duration) (Issues, error) {
	if log == nil {
		return nil, errors.New("logger is nil")
	}
	if flushInterval <= 0 {
		flushInterval = defaultFlushInterval
	}

	var store Issues
	if r == nil {
		store = newMemoryStore(defaultTTL, defaultGCInterval)
		log.Info(context.Background(), "issues: using in-memory store")
	} else {
		store = newBufferedStore(r, defaultTTL, flushInterval, defaultGCInterval)
		log.Info(context.Background(), "issues: using buffered redis store (flush every %s)", flushInterval)
	}

	return &issuesImpl{
		log:   log,
		store: store,
	}, nil
}

func (i *issuesImpl) Add(sessionID uint64, issueType string) error {
	if issueType == "" {
		return errors.New("issueType is empty")
	}
	return i.store.Add(sessionID, issueType)
}

func (i *issuesImpl) Get(sessionID uint64) ([]string, error) {
	res, err := i.store.Get(sessionID)
	return res, err
}

func (i *issuesImpl) Flush() error {
	return i.store.Flush()
}

type redisStore struct {
	cli *redis.Client
	ttl time.Duration
}

func newRedisStore(cli *redis.Client, ttl time.Duration) *redisStore {
	return &redisStore{cli: cli, ttl: ttl}
}

func (s *redisStore) key(sessionID uint64) string {
	return redisKeyPrefix + u64(sessionID)
}

func (s *redisStore) Add(sessionID uint64, issueType string) error {
	ctx := context.Background()
	key := s.key(sessionID)
	pipe := s.cli.Redis.Pipeline()
	pipe.SAdd(ctx, key, issueType)
	pipe.Expire(ctx, key, s.ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *redisStore) Get(sessionID uint64) ([]string, error) {
	ctx := context.Background()
	key := s.key(sessionID)
	values, err := s.cli.Redis.SMembers(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	if values == nil {
		return []string{}, nil
	}
	return values, nil
}

func (s *redisStore) addMany(items map[uint64][]string) error {
	if len(items) == 0 {
		return nil
	}
	ctx := context.Background()
	pipe := s.cli.Redis.Pipeline()
	for sessionID, types := range items {
		if len(types) == 0 {
			continue
		}
		key := s.key(sessionID)
		members := make([]interface{}, len(types))
		for i, t := range types {
			members[i] = t
		}
		pipe.SAdd(ctx, key, members...)
		pipe.Expire(ctx, key, s.ttl)
	}
	_, err := pipe.Exec(ctx)
	return err
}

type bufferedStore struct {
	backing    *redisStore
	flushEvery time.Duration
	sessionTTL time.Duration
	mu         sync.Mutex
	sessions   map[uint64]*sessIssues
}

type sessIssues struct {
	known   map[string]struct{}
	pending []string
	touched time.Time
}

func newBufferedStore(cli *redis.Client, ttl, flushEvery, gcInterval time.Duration) *bufferedStore {
	b := &bufferedStore{
		backing:    newRedisStore(cli, ttl),
		flushEvery: flushEvery,
		sessionTTL: ttl,
		sessions:   make(map[uint64]*sessIssues),
	}
	go b.loop(gcInterval)
	return b
}

func (b *bufferedStore) Add(sessionID uint64, issueType string) error {
	b.mu.Lock()
	s := b.sessions[sessionID]
	if s == nil {
		s = &sessIssues{known: make(map[string]struct{}, 4)}
		b.sessions[sessionID] = s
	}
	s.touched = time.Now()
	if _, ok := s.known[issueType]; !ok {
		s.known[issueType] = struct{}{}
		s.pending = append(s.pending, issueType)
	}
	b.mu.Unlock()
	return nil
}

func (b *bufferedStore) Get(sessionID uint64) ([]string, error) {
	b.mu.Lock()
	s := b.sessions[sessionID]
	var all []string
	if s != nil {
		all = make([]string, 0, len(s.known))
		for t := range s.known {
			all = append(all, t)
		}
		s.pending = nil
	}
	b.mu.Unlock()

	var writeErr error
	if len(all) > 0 {
		if writeErr = b.backing.addMany(map[uint64][]string{sessionID: all}); writeErr != nil {
			b.mu.Lock()
			if s2 := b.sessions[sessionID]; s2 != nil {
				s2.pending = append(s2.pending, all...)
			}
			b.mu.Unlock()
		}
	}

	res, readErr := b.backing.Get(sessionID)
	if writeErr != nil || readErr != nil {
		res = mergeUnique(res, all)
	} else {
		b.mu.Lock()
		if s2 := b.sessions[sessionID]; s2 != nil && len(s2.pending) == 0 {
			delete(b.sessions, sessionID)
		}
		b.mu.Unlock()
	}
	if writeErr != nil {
		return res, writeErr
	}
	return res, readErr
}

func mergeUnique(a, b []string) []string {
	if len(b) == 0 {
		return a
	}
	seen := make(map[string]struct{}, len(a)+len(b))
	out := make([]string, 0, len(a)+len(b))
	for _, v := range a {
		if _, ok := seen[v]; !ok {
			seen[v] = struct{}{}
			out = append(out, v)
		}
	}
	for _, v := range b {
		if _, ok := seen[v]; !ok {
			seen[v] = struct{}{}
			out = append(out, v)
		}
	}
	return out
}

func (b *bufferedStore) loop(gcInterval time.Duration) {
	flushT := time.NewTicker(b.flushEvery)
	gcT := time.NewTicker(gcInterval)
	defer flushT.Stop()
	defer gcT.Stop()
	for {
		select {
		case <-flushT.C:
			_ = b.Flush()
		case <-gcT.C:
			b.gc()
		}
	}
}

func (b *bufferedStore) Flush() error {
	b.mu.Lock()
	if len(b.sessions) == 0 {
		b.mu.Unlock()
		return nil
	}
	batch := make(map[uint64][]string)
	for sessionID, s := range b.sessions {
		if len(s.pending) > 0 {
			batch[sessionID] = s.pending
			s.pending = nil
		}
	}
	b.mu.Unlock()
	if len(batch) == 0 {
		return nil
	}
	if err := b.backing.addMany(batch); err != nil {
		b.mu.Lock()
		for sessionID, types := range batch {
			s := b.sessions[sessionID]
			if s == nil {
				s = &sessIssues{known: make(map[string]struct{}, len(types)), touched: time.Now()}
				for _, t := range types {
					s.known[t] = struct{}{}
				}
				b.sessions[sessionID] = s
			}
			s.pending = append(s.pending, types...)
		}
		b.mu.Unlock()
		return err
	}
	return nil
}

func (b *bufferedStore) gc() {
	cutoff := time.Now().Add(-b.sessionTTL)
	b.mu.Lock()
	for sessionID, s := range b.sessions {
		if len(s.pending) == 0 && s.touched.Before(cutoff) {
			delete(b.sessions, sessionID)
		}
	}
	b.mu.Unlock()
}

type memEntry struct {
	set       map[string]struct{}
	expiresAt time.Time
}

type memoryStore struct {
	ttl        time.Duration
	gcInterval time.Duration
	mu         sync.RWMutex
	data       map[uint64]*memEntry
	stopCh     chan struct{}
}

func newMemoryStore(ttl, gcInterval time.Duration) *memoryStore {
	ms := &memoryStore{
		ttl:        ttl,
		gcInterval: gcInterval,
		data:       make(map[uint64]*memEntry),
		stopCh:     make(chan struct{}),
	}
	go ms.gcLoop()
	return ms
}

func (m *memoryStore) Add(sessionID uint64, issueType string) error {
	now := time.Now()

	m.mu.Lock()
	defer m.mu.Unlock()

	e, ok := m.data[sessionID]
	if !ok {
		e = &memEntry{set: make(map[string]struct{}, 1)}
		m.data[sessionID] = e
	}
	e.set[issueType] = struct{}{}
	e.expiresAt = now.Add(m.ttl)

	return nil
}

func (m *memoryStore) Get(sessionID uint64) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if e, ok := m.data[sessionID]; ok {
		out := make([]string, 0, len(e.set))
		for s := range e.set {
			out = append(out, s)
		}
		return out, nil
	}
	return []string{}, nil
}

func (m *memoryStore) Flush() error { return nil }

func (m *memoryStore) gcLoop() {
	t := time.NewTicker(m.gcInterval)
	defer t.Stop()

	for {
		select {
		case <-t.C:
			now := time.Now()
			m.mu.Lock()
			for k, v := range m.data {
				if now.After(v.expiresAt) {
					delete(m.data, k)
				}
			}
			m.mu.Unlock()
		case <-m.stopCh:
			return
		}
	}
}

func u64(v uint64) string {
	var buf [20]byte
	i := len(buf)
	for {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
		if v == 0 {
			break
		}
	}
	return string(buf[i:])
}
