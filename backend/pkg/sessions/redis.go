package sessions

import (
	"errors"
	"openreplay/backend/pkg/db/redis"
)

type cacheImpl struct{}

func (c *cacheImpl) SetCache(sessID uint64, data map[string]string) error {
	return ErrDisabledCache
}

func (c *cacheImpl) GetCache(sessID uint64) (map[string]string, error) {
	return nil, ErrDisabledCache
}

func (c *cacheImpl) Set(session *Session) error {
	return ErrDisabledCache
}

func (c *cacheImpl) Get(sessionID uint64) (*Session, error) {
	return nil, ErrDisabledCache
}

var ErrDisabledCache = errors.New("cache is disabled")

func NewCache(db *redis.Client) Cache {
	return &cacheImpl{}
}
