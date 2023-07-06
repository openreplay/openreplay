package sessions

import (
	"errors"
	"log"
	"openreplay/backend/pkg/cache"
	"time"
)

type Cache interface {
	Set(session *Session) error
	Get(sessionID uint64) (*Session, error)
}

var ErrSessionNotFound = errors.New("session not found")

type inMemoryCacheImpl struct {
	sessions cache.Cache
	redis    Cache
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
		return session, nil
	}
	if !errors.Is(err, ErrDisabledCache) && err.Error() != "redis: nil" {
		log.Printf("Failed to get session from cache: %v", err)
	}
	return nil, ErrSessionNotFound
}

func NewInMemoryCache(redisCache Cache) Cache {
	return &inMemoryCacheImpl{
		sessions: cache.New(time.Minute*3, time.Minute*5),
		redis:    redisCache,
	}
}
