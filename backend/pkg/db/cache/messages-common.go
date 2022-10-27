package cache

import (
	"log"
	. "openreplay/backend/pkg/messages"
	"time"
	//	. "openreplay/backend/pkg/db/types"
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
	c.DeleteSession(sessionID)
	return nil
}

func (c *PGCache) InsertIssueEvent(sessionID uint64, crash *IssueEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertIssueEvent(sessionID, session.ProjectID, crash)
}

func (c *PGCache) InsertMetadata(sessionID uint64, metadata *Metadata) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	project, err := c.GetProject(session.ProjectID)
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
