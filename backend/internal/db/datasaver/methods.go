package datasaver

import (
	. "openreplay/backend/pkg/messages"
)

func (s *saverImpl) init() {
	// noop
}

func (s *saverImpl) handleExtraMessage(msg Message) error {
	switch m := msg.(type) {
	case *PerformanceTrackAggr:
		return s.pg.InsertWebStatsPerformance(m)
	}
	return nil
}
