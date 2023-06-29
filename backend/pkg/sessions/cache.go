package sessions

import (
	"encoding/json"
	"errors"
	"fmt"
	"openreplay/backend/pkg/db/redis"
	"time"
)

type Cache interface {
	Set(session *Session) error
	Get(sessionID uint32) (*Session, error)
}

type cacheImpl struct {
	db *redis.Client
}

func (c *cacheImpl) Set(session *Session) error {
	if c.db == nil {
		return ErrDisabledCache
	}
	sessionBytes, err := json.Marshal(session)
	if err != nil {
		return err
	}
	if _, err = c.db.Redis.Set(fmt.Sprintf("session:id:%d", session.SessionID), sessionBytes, time.Minute*10).Result(); err != nil {
		return err
	}
	return nil
}

func (c *cacheImpl) Get(sessionID uint32) (*Session, error) {
	if c.db == nil {
		return nil, ErrDisabledCache
	}
	result, err := c.db.Redis.Get(fmt.Sprintf("session:id:%d", sessionID)).Result()
	if err != nil {
		return nil, err
	}
	session := &Session{}
	if err = json.Unmarshal([]byte(result), session); err != nil {
		return nil, err
	}
	return session, nil
}

var ErrDisabledCache = errors.New("cache is disabled")

func NewCache(db *redis.Client) Cache {
	return &cacheImpl{db: db}
}
