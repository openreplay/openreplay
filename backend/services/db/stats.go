package main

import (

	. "openreplay/backend/pkg/messages"
	. "openreplay/backend/pkg/db/types"
)

func initStats() {
  // noop
}


func insertStats(session *Session, msg Message) error {
	switch m := msg.(type) {
		// Web
		case *PerformanceTrackAggr:
			return pg.InsertWebStatsPerformance(session.SessionID, m)
		case *ResourceEvent:
			return pg.InsertWebStatsResourceEvent(session.SessionID, m)
		case *LongTask:
			return pg.InsertWebStatsLongtask(session.SessionID, m)

		// IOS
		// case *IOSPerformanceAggregated:
		// 	return pg.InsertIOSPerformanceAggregated(session, m)
		// case *IOSNetworkCall:
		// 	return pg.InsertIOSNetworkCall(session, m)
	}
	return nil
}

func commitStats() error {
	return nil
}
