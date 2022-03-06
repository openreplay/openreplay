package cache

import (
	"github.com/jackc/pgx/v4"

	. "openreplay/backend/pkg/db/types"
)

func (c *PGCache) GetSession(sessionID uint64) (*Session, error) {
	if s, inCache := c.sessions[sessionID]; inCache {
		// TODO: review. Might cause bugs in case of multiple instances
		if s == nil {
			return nil, pgx.ErrNoRows
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
	delete(c.sessions, sessionID)
}
