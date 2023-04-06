package cache

import (
	"log"
	. "openreplay/backend/pkg/messages"
	"time"
)

func (c *PGCache) InsertSessionEnd(sessionID uint64, timestamp uint64) (uint64, error) {
	return c.Conn.InsertSessionEnd(sessionID, timestamp)
}

func (c *PGCache) InsertSessionEncryptionKey(sessionID uint64, key []byte) error {
	return c.Conn.InsertSessionEncryptionKey(sessionID, key)
}

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
	if crash.Type == "app_crash" {
		return c.Conn.InsertAppCrash(sessionID, session.ProjectID, crash)
	}
	return c.Conn.InsertIssueEvent(sessionID, session.ProjectID, crash)
}

func (c *PGCache) InsertMetadata(metadata *Metadata) error {
	sessionID := metadata.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	project, err := c.Cache.GetProject(session.ProjectID)
	if err != nil {
		return err
	}

	keyNo := project.GetMetadataNo(metadata.Key)

	if keyNo == 0 {
		// TODO: insert project metadata
		return nil
	}
	if err := c.Conn.InsertMetadata(sessionID, keyNo, metadata.Value); err != nil {
		// Try to insert metadata after one minute
		time.AfterFunc(time.Minute, func() {
			if err := c.Conn.InsertMetadata(sessionID, keyNo, metadata.Value); err != nil {
				log.Printf("metadata retry err: %s", err)
			}
		})
		return err
	}
	session.SetMetadata(keyNo, metadata.Value)
	return nil
}
