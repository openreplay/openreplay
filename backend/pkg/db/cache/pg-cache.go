package cache

import (
	"openreplay/backend/pkg/db/postgres"
)

type PGCache struct {
	*postgres.Conn
	cache Cache
}

func NewPGCache(conn *postgres.Conn, projectExpirationTimeoutMs int64) *PGCache {
	// Create in-memory cache layer for sessions and projects
	c := NewCache(conn, projectExpirationTimeoutMs)
	// Return PG wrapper with integrated cache layer
	return &PGCache{
		Conn:  conn,
		cache: c,
	}
}
