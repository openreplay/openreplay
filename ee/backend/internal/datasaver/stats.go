package datasaver

import (
	"log"
	"time"

	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/env"
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
		return si.pg.InsertWebSession(session)
	case *PerformanceTrackAggr:
		return si.pg.InsertWebPerformanceTrackAggr(session, m)
	case *ClickEvent:
		return si.pg.InsertWebClickEvent(session, m)
	case *InputEvent:
		return si.pg.InsertWebInputEvent(session, m)
		// Unique for Web
	case *PageEvent:
		si.pg.InsertWebPageEvent(session, m)
	case *ResourceEvent:
		return si.pg.InsertWebResourceEvent(session, m)
	case *ErrorEvent:
		return si.pg.InsertWebErrorEvent(session, m)
	case *LongTask:
		return si.pg.InsertLongtask(session, m)

	// IOS
	case *IOSSessionEnd:
		return si.pg.InsertIOSSession(session)
	case *IOSPerformanceAggregated:
		return si.pg.InsertIOSPerformanceAggregated(session, m)
	case *IOSClickEvent:
		return si.pg.InsertIOSClickEvent(session, m)
	case *IOSInputEvent:
		return si.pg.InsertIOSInputEvent(session, m)
	// Unique for Web
	case *IOSScreenEnter:
		//ch.InsertIOSView(session, m)
	case *IOSCrash:
		return si.pg.InsertIOSCrash(session, m)
	case *IOSNetworkCall:
		return si.pg.InsertIOSNetworkCall(session, m)
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
