package datasaver

import (
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/clickhouse"
)

type Saver struct {
	pg *cache.PGCache
	ch clickhouse.Connector
}

func New(pg *cache.PGCache) *Saver {
	return &Saver{pg: pg}
}
