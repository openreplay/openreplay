package cache

import (
	. "openreplay/backend/pkg/messages"
	//	. "openreplay/backend/pkg/db/types"
)

func (c *PGCache) InsertSessionEnd(sessionID uint64, timestamp uint64) error {
	_, err := c.Conn.InsertSessionEnd(sessionID, timestamp)
	if err != nil {
		return err
	}
	return nil
}

func (c *PGCache) HandleSessionEnd(sessionID uint64) error {
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
		return err
	}
	session.SetMetadata(keyNo, metadata.Value)
	return nil
}
