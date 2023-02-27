package datasaver

import (
	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

type Saver struct {
	pg       *cache.PGCache
	ch       clickhouse.Connector
	producer types.Producer
	topic    string
}

func New(pg *cache.PGCache, cfg *db.Config) *Saver {
	var producer types.Producer = nil
	if cfg.UseQuickwit {
		producer = queue.NewProducer(cfg.MessageSizeLimit, true)
	}
	return &Saver{pg: pg, producer: producer, topic: cfg.QuickwitTopic}
}
