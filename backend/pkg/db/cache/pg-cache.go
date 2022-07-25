package cache

import (
	"sync"
	"time"

	"openreplay/backend/pkg/db/postgres"
	. "openreplay/backend/pkg/db/types"
)

type ProjectMeta struct {
	*Project
	expirationTime time.Time
}

// !TODO: remove old sessions by timeout to avoid memleaks

/*
 *  Cache layer around the stateless PG adapter
**/
type PGCache struct {
	*postgres.Conn
	sessions                 map[uint64]*Session
	projects                 map[uint32]*ProjectMeta
	projectsByKeys           sync.Map // map[string]*ProjectMeta
	projectExpirationTimeout time.Duration
}

// TODO: create conn automatically
func NewPGCache(pgConn *postgres.Conn, projectExpirationTimeoutMs int64) *PGCache {
	return &PGCache{
		Conn:                     pgConn,
		sessions:                 make(map[uint64]*Session),
		projects:                 make(map[uint32]*ProjectMeta),
		projectExpirationTimeout: time.Duration(1000 * projectExpirationTimeoutMs),
	}
}
