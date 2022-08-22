package datasaver

import (
	"log"
	"time"

	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
)

var ch clickhouse.Connector
var finalizeTicker <-chan time.Time

func (si *Saver) InitStats() {
	ch = clickhouse.NewConnector(env.String("CLICKHOUSE_STRING"))
	if err := ch.Prepare(); err != nil {
		log.Fatalf("Clickhouse prepare error: %v\n", err)
	}

	finalizeTicker = time.Tick(20 * time.Minute)

}

func (si *Saver) InsertStats(session *types.Session, msg messages.Message) error {
	switch m := msg.(type) {
	// Web
	case *messages.SessionEnd:
		// TODO: get issue_types and base_referrer before session end
		return ch.InsertWebSession(session)
	case *messages.PerformanceTrackAggr:
		// TODO: page_path
		return ch.InsertWebPerformanceTrackAggr(session, m)
	case *messages.ClickEvent:
		return ch.InsertWebClickEvent(session, m)
	case *messages.InputEvent:
		return ch.InsertWebInputEvent(session, m)
	// Unique for Web
	case *messages.PageEvent:
		return ch.InsertWebPageEvent(session, m)
	case *messages.ResourceEvent:
		return ch.InsertWebResourceEvent(session, m)
	case *messages.ErrorEvent:
		return ch.InsertWebErrorEvent(session, m)
	}
	return nil
}

func (si *Saver) CommitStats() error {
	select {
	case <-finalizeTicker:
		if err := ch.FinaliseSessionsTable(); err != nil {
			log.Printf("Stats: FinaliseSessionsTable returned an error. %v", err)
		}
	default:
	}
	return ch.Commit()
}
