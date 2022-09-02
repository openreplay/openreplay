package datasaver

import (
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/queue/types"
)

type Saver struct {
	pg       *cache.PGCache
	producer types.Producer
}

func New(pg *cache.PGCache, producer types.Producer) *Saver {
	return &Saver{pg: pg, producer: producer}
}
