package cache

import (
	"log"
	. "openreplay/backend/pkg/messages"
)

func (c *PGCache) HandleSessionEnd(sessionID uint64) error {
	if err := c.Conn.HandleSessionEnd(sessionID); err != nil {
		log.Printf("can't handle session end: %s", err)
	}
	return nil
}

func (c *PGCache) InsertIssueEvent(crash *IssueEvent) error {
	sessionID := crash.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertIssueEvent(sessionID, session.ProjectID, crash)
}

func (c *PGCache) InsertMetadata(metadata *Metadata) error {
	return c.Conn.Sessions.InsertMetadata(metadata)
}
