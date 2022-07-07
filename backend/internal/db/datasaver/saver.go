package datasaver

import "openreplay/backend/pkg/db/cache"

type Saver struct {
	pg *cache.PGCache
}

func New(pg *cache.PGCache) *Saver {
	return &Saver{pg: pg}
}
