package main

import (
	"openreplay/backend/pkg/db/cache"
	. "openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
)

type StatsInserter struct {
	pg *cache.PGCache
}

func NewStatsInserter(pg *cache.PGCache) *StatsInserter {
	return &StatsInserter{pg: pg}
}

func (si *StatsInserter) insertStats(session *Session, msg Message) error {
	switch m := msg.(type) {
	// Web
	case *PerformanceTrackAggr:
		return si.pg.InsertWebStatsPerformance(session.SessionID, m)
	case *ResourceEvent:
		return si.pg.InsertWebStatsResourceEvent(session.SessionID, m)
	case *LongTask:
		return si.pg.InsertWebStatsLongtask(session.SessionID, m)

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
