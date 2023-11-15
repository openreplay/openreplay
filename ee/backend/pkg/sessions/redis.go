package sessions

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/metrics/database"
)

type cacheImpl struct {
	db *redis.Client
}

func (c *cacheImpl) SetCache(sessID uint64, data map[string]string) error {
	if c.db == nil {
		return ErrDisabledCache
	}
	if data == nil {
		return errors.New("session is nil")
	}
	if sessID == 0 {
		return errors.New("session id is 0")
	}
	start := time.Now()
	sessionBytes, err := json.Marshal(data)
	if err != nil {
		return err
	}
	if _, err = c.db.Redis.Set(fmt.Sprintf("session:cache:id:%d", sessID), sessionBytes, time.Minute*120).Result(); err != nil {
		return err
	}
	database.RecordRedisRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "setCache", "session")
	database.IncreaseRedisRequests("setCache", "sessions")
	return nil
}

func (c *cacheImpl) GetCache(sessID uint64) (map[string]string, error) {
	if c.db == nil {
		return nil, ErrDisabledCache
	}
	if sessID == 0 {
		return nil, errors.New("session id is 0")
	}
	start := time.Now()
	result, err := c.db.Redis.Get(fmt.Sprintf("session:cache:id:%d", sessID)).Result()
	if err != nil {
		return nil, err
	}
	session := map[string]string{}
	if err = json.Unmarshal([]byte(result), &session); err != nil {
		return nil, err
	}
	database.RecordRedisRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "getCache", "session")
	database.IncreaseRedisRequests("getCache", "sessions")
	return session, nil
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
	start := time.Now()
	sessionBytes, err := json.Marshal(session)
	if err != nil {
		return err
	}
	if _, err = c.db.Redis.Set(fmt.Sprintf("session:id:%d", session.SessionID), sessionBytes, time.Minute*60).Result(); err != nil {
		return err
	}
	database.RecordRedisRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "set", "session")
	database.IncreaseRedisRequests("set", "sessions")
	return nil
}

func (c *cacheImpl) Get(sessionID uint64) (*Session, error) {
	if c.db == nil {
		return nil, ErrDisabledCache
	}
	if sessionID == 0 {
		return nil, errors.New("session id is 0")
	}
	start := time.Now()
	result, err := c.db.Redis.Get(fmt.Sprintf("session:id:%d", sessionID)).Result()
	if err != nil {
		return nil, err
	}
	session := &Session{}
	if err = json.Unmarshal([]byte(result), session); err != nil {
		return nil, err
	}
	database.RecordRedisRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "get", "session")
	database.IncreaseRedisRequests("get", "sessions")
	return session, nil
}

var ErrDisabledCache = errors.New("cache is disabled")

func NewCache(db *redis.Client) Cache {
	return &cacheImpl{db: db}
}
