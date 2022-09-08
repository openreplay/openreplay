package datasaver

import (
	"errors"
	"log"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions/cache"
)

func (si *Saver) InitStats() {
	// noop
}

func (si *Saver) InsertStats(sessionID uint64, msg Message) error {
	session, err := si.cache.GetSession(sessionID)
	if session == nil {
		if err != nil && !errors.Is(err, cache.NilSessionInCacheError) {
			log.Printf("Error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, sessionID, msg)
		}
		return err
	}
	switch m := msg.(type) {
	// Web
	case *PerformanceTrackAggr:
		return si.stats.InsertWebStatsPerformance(session.SessionID, m)
	case *ResourceEvent:
		return si.stats.InsertWebStatsResourceEvent(session.SessionID, m)
	}
	return nil
}

func (si *Saver) CommitStats() error {
	return nil
}
