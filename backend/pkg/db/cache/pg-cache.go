package cache

import (
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/sessions"
	"time"
)

type PGCache struct {
	*postgres.Conn
	Projects Cache
	Sessions sessions.Sessions
}

func NewPGCache(conn *postgres.Conn, projectExpiration time.Duration) *PGCache {
	// Create in-memory cache layer for sessions and projects
	c := NewCache(conn, projectExpiration)
	// Return PG wrapper with integrated cache layer
	return &PGCache{
		Conn:     conn,
		Projects: c,
		Sessions: sessions.New(conn),
	}
}
