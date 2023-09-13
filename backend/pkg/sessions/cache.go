package sessions

import (
	"errors"
	"log"
	"time"

	"openreplay/backend/pkg/cache"
)

type Cache interface {
	Set(session *Session) error
	Get(sessionID uint64) (*Session, error)
	SetCache(sessID uint64, data map[string]string) error
	GetCache(sessID uint64) (map[string]string, error)
}

var ErrSessionNotFound = errors.New("session not found")

type inMemoryCacheImpl struct {
	sessions cache.Cache
	redis    Cache
}

func (i *inMemoryCacheImpl) SetCache(sessID uint64, data map[string]string) error {
	if err := i.redis.SetCache(sessID, data); err != nil && !errors.Is(err, ErrDisabledCache) {
		log.Printf("Failed to cache session: %v", err)
	}
	return nil
}

func (i *inMemoryCacheImpl) GetCache(sessID uint64) (map[string]string, error) {
	session, err := i.redis.GetCache(sessID)
	if err == nil {
		return session, nil
	}
	if !errors.Is(err, ErrDisabledCache) && err.Error() != "redis: nil" {
		log.Printf("Failed to get session from cache: %v", err)
	}
	return nil, ErrSessionNotFound
}

func (i *inMemoryCacheImpl) Set(session *Session) error {
	i.sessions.Set(session.SessionID, session)
	if err := i.redis.Set(session); err != nil && !errors.Is(err, ErrDisabledCache) {
		log.Printf("Failed to cache session: %v", err)
	}
	return nil
}

func (i *inMemoryCacheImpl) Get(sessionID uint64) (*Session, error) {
	if session, ok := i.sessions.Get(sessionID); ok {
		return session.(*Session), nil
	}
	session, err := i.redis.Get(sessionID)
	if err == nil {
		i.sessions.Set(sessionID, session)
		return session, nil
	}
	if !errors.Is(err, ErrDisabledCache) && err.Error() != "redis: nil" {
		log.Printf("Failed to get session from cache: %v", err)
	}
	return nil, ErrSessionNotFound
}

func NewInMemoryCache(redisCache Cache) Cache {
	return &inMemoryCacheImpl{
		sessions: cache.New(time.Minute*3, time.Minute*10),
		redis:    redisCache,
	}
}
