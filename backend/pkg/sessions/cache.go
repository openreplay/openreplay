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
	Get(sessionID uint64) (*Session, error)
	Delete(sessionID uint64) error
}

type cacheImpl struct {
	db *redis.Client
}

func (c *cacheImpl) Set(session *Session) error {
	if c.db == nil {
		return ErrDisabledCache
	}
	if session == nil {
		return errors.New("session is nil")
	}
	if session.SessionID == 0 {
		return errors.New("session id is 0")
	}
	sessionBytes, err := json.Marshal(session)
	if err != nil {
		return err
	}
	if _, err = c.db.Redis.Set(fmt.Sprintf("session:id:%d", session.SessionID), sessionBytes, time.Minute*30).Result(); err != nil {
		return err
	}
	return nil
}

func (c *cacheImpl) Get(sessionID uint64) (*Session, error) {
	if c.db == nil {
		return nil, ErrDisabledCache
	}
	if sessionID == 0 {
		return nil, errors.New("session id is 0")
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

func (c *cacheImpl) Delete(sessionID uint64) error {
	if c.db == nil {
		return ErrDisabledCache
	}
	if sessionID == 0 {
		return errors.New("session id is 0")
	}
	if _, err := c.db.Redis.Del(fmt.Sprintf("session:id:%d", sessionID)).Result(); err != nil {
		return err
	}
	return nil
}

var ErrDisabledCache = errors.New("cache is disabled")

func NewCache(db *redis.Client) Cache {
	return &cacheImpl{db: db}
}
