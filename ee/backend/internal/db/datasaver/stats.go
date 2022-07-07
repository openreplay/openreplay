package datasaver

import (
	"log"
	"time"

	"openreplay/backend/pkg/db/clickhouse"
	. "openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/env"
	. "openreplay/backend/pkg/messages"
)

var ch *clickhouse.Connector
var finalizeTicker <-chan time.Time

func (si *Saver) InitStats() {
	ch = clickhouse.NewConnector(env.String("CLICKHOUSE_STRING"))
	if err := ch.Prepare(); err != nil {
		log.Fatalf("Clickhouse prepare error: %v\n", err)
	}

	finalizeTicker = time.Tick(20 * time.Minute)

}

func (si *Saver) InsertStats(session *Session, msg Message) error {
	switch m := msg.(type) {
	// Web
	case *SessionEnd:
		return ch.InsertWebSession(session)
	case *PerformanceTrackAggr:
		return ch.InsertWebPerformanceTrackAggr(session, m)
	case *ClickEvent:
		return ch.InsertWebClickEvent(session, m)
	case *InputEvent:
		return ch.InsertWebInputEvent(session, m)
		// Unique for Web
	case *PageEvent:
		ch.InsertWebPageEvent(session, m)
	case *ResourceEvent:
		return ch.InsertWebResourceEvent(session, m)
	case *ErrorEvent:
		return ch.InsertWebErrorEvent(session, m)
	case *LongTask:
		return ch.InsertLongtask(session, m)
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
	errCommit := ch.Commit()
	errPrepare := ch.Prepare()
	if errCommit != nil {
		return errCommit
	}
	return errPrepare
}
