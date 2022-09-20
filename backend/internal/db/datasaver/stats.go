package datasaver

import (
	. "openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
)

func (si *Saver) InitStats() {
	// noop
}

func (si *Saver) InsertStats(session *Session, msg Message) error {
	switch m := msg.(type) {
	// Web
	case *PerformanceTrackAggr:
		return si.pg.InsertWebStatsPerformance(session.SessionID, m)
	case *ResourceEvent:
		return si.pg.InsertWebStatsResourceEvent(session.SessionID, m)
	case *LongTask:
		return si.pg.InsertWebStatsLongtask(session.SessionID, m)
	}
	return nil
}

func (si *Saver) CommitStats(optimize bool) error {
	return nil
}
