package datasaver

import (
	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/queue/types"
)

type Saver struct {
	pg       *cache.PGCache
	producer types.Producer
}

func New(pg *cache.PGCache, _ *db.Config) *Saver {
	return &Saver{pg: pg, producer: nil}
}
