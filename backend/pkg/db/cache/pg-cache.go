package cache

import (
	"openreplay/backend/pkg/db/postgres"
	"time"
)

type PGCache struct {
	*postgres.Conn
	Cache Cache
}

func NewPGCache(conn *postgres.Conn, projectExpiration time.Duration) *PGCache {
	// Create in-memory cache layer for sessions and projects
	c := NewCache(conn, projectExpiration)
	// Return PG wrapper with integrated cache layer
	return &PGCache{
		Conn:  conn,
		Cache: c,
	}
}
