package issues

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
)

type Issues interface {
	Add(sessionID uint64, issueType string) error
	Get(sessionID uint64) ([]string, error)
}

type issuesImpl struct {
	log   logger.Logger
	store Issues
}

const (
	defaultTTL        = 3 * time.Hour
	defaultGCInterval = 5 * time.Minute
	redisKeyPrefix    = "issues:"
)

func New(log logger.Logger, r *redis.Client) (Issues, error) {
	if log == nil {
		return nil, errors.New("logger is nil")
	}

	var store Issues
	if r == nil {
		store = newMemoryStore(defaultTTL, defaultGCInterval)
		log.Info(context.Background(), "issues: using in-memory store")
	} else {
		store = newRedisStore(r, defaultTTL)
		log.Info(context.Background(), "issues: using redis store")
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
	i.log.Info(context.Background(), "issues: adding issue to store, sessID: %d, issueType: %s", sessionID, issueType)
	return i.store.Add(sessionID, issueType)
}

func (i *issuesImpl) Get(sessionID uint64) ([]string, error) {
	res, err := i.store.Get(sessionID)
	i.log.Info(context.Background(), "issues: sessID: %d, issue types: %s", sessionID, strings.Join(res, ","))
	return res, err
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
	if _, err := s.cli.Redis.SAdd(ctx, key, issueType).Result(); err != nil {
		return err
	}
	if _, err := s.cli.Redis.Expire(ctx, key, s.ttl).Result(); err != nil {
		return err
	}
	return nil
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
