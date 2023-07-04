package sessions

import (
	"errors"
	"openreplay/backend/pkg/cache"
	"time"
)

var ErrSessionNotFound = errors.New("session not found")

type inMemoryCacheImpl struct {
	sessions cache.Cache
}

func (i *inMemoryCacheImpl) Set(session *Session) error {
	i.sessions.Set(session.SessionID, session)
	return nil
}

func (i *inMemoryCacheImpl) Get(sessionID uint64) (*Session, error) {
	session, ok := i.sessions.Get(sessionID)
	if !ok {
		return nil, ErrSessionNotFound
	}
	return session.(*Session), nil
}

func NewInMemoryCache() Cache {
	return &inMemoryCacheImpl{
		sessions: cache.New(time.Minute*5, time.Minute*3),
	}
}
