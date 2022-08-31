package cache

import (
	"errors"
	"github.com/jackc/pgx/v4"
	"log"

	. "openreplay/backend/pkg/db/types"
)

var NilSessionInCacheError = errors.New("nil session in error")

func (c *PGCache) GetSession(sessionID uint64) (*Session, error) {
	log.Printf("GetSession, sessID: %d", sessionID)
	if s, inCache := c.sessions[sessionID]; inCache {
		if s == nil {
			return s, NilSessionInCacheError
		}
		return s, nil
	}
	s, err := c.Conn.GetSession(sessionID)
	if err == pgx.ErrNoRows {
		c.sessions[sessionID] = nil
	}
	if err != nil {
		return nil, err
	}
	c.sessions[sessionID] = s
	return s, nil
}

func (c *PGCache) DeleteSession(sessionID uint64) {
	log.Printf("DeleteSession, sessID: %d", sessionID)
	delete(c.sessions, sessionID)
}
