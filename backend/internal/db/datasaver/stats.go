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
	case *ResourceTiming:
		return si.pg.InsertWebStatsResourceEvent(session.SessionID, m)
	}
	return nil
}

func (si *Saver) CommitStats() error {
	return nil
}

func (si *Saver) Close() error {
	return nil
}
