package cache

import (
	"errors"
	"fmt"
	"github.com/jackc/pgx/v4"
	. "openreplay/backend/pkg/db/types"
	"time"
)

var NilSessionInCacheError = errors.New("nil session in error")

func (c *cacheImpl) SetSession(sess *Session) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if meta, ok := c.sessions[sess.SessionID]; ok {
		meta.Session = sess
		meta.lastUse = time.Now()
	} else {
		c.sessions[sess.SessionID] = &SessionMeta{sess, time.Now()}
	}
}

func (c *cacheImpl) HasSession(sessID uint64) bool {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	sess, ok := c.sessions[sessID]
	return ok && sess.Session != nil
}

func (c *cacheImpl) GetSession(sessionID uint64) (*Session, error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if s, inCache := c.sessions[sessionID]; inCache {
		if s.Session == nil {
			return nil, NilSessionInCacheError
		}
		return s.Session, nil
	}
	s, err := c.conn.GetSession(sessionID)
	if err == pgx.ErrNoRows {
		c.sessions[sessionID] = &SessionMeta{nil, time.Now()}
	}
	if err != nil {
		return nil, err
	}
	c.sessions[sessionID] = &SessionMeta{s, time.Now()}
	return s, nil
}

func (c *cacheImpl) SetSessionDuration(sessID, duration uint64) error {
	if duration <= 0 {
		return fmt.Errorf("session duration wrong value, val: %d", duration)
	}

	c.mutex.Lock()
	defer c.mutex.Unlock()

	// Updating session duration to avoid insert errors in CH
	sess, ok := c.sessions[sessID]
	if ok && sess.Session != nil {
		sess.Session.Duration = &duration
	}
	return nil
}
