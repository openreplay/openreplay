package main

import (
	"log"
	"time"


	. "openreplay/backend/pkg/messages"
	. "openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/env"
)

var ch *clickhouse.Connector
var finalizeTicker <-chan time.Time

func initStats() {
	ch = clickhouse.NewConnector(env.String("CLICKHOUSE_STRING"))
	if err := ch.Prepare(); err != nil {
		log.Fatalf("Clickhouse prepare error: %v\n", err)
	}

  finalizeTicker = time.Tick(20 * time.Minute)

}

func insertStats(session *Session, msg Message) error {
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

		// IOS
		case *IOSSessionEnd:
			return ch.InsertIOSSession(session)
		case *IOSPerformanceAggregated:
			return ch.InsertIOSPerformanceAggregated(session, m)
		case *IOSClickEvent:
			return ch.InsertIOSClickEvent(session, m)
		case *IOSInputEvent:
			return ch.InsertIOSInputEvent(session, m)
		// Unique for Web
		case *IOSScreenEnter:
			//ch.InsertIOSView(session, m)
		case *IOSCrash:	
			return ch.InsertIOSCrash(session, m)
		case *IOSNetworkCall:
			return ch.InsertIOSNetworkCall(session, m)
	}
	return nil
}

func commitStats() error {
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

