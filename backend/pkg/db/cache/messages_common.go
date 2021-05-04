package cache

import  (
	. "openreplay/backend/pkg/messages"
//	. "openreplay/backend/pkg/db/types"
)

func (c *PGCache) insertSessionEnd(sessionID uint64, timestamp uint64 ) error {
	//duration, err := c.Conn.InsertSessionEnd(sessionID, timestamp)
	_, err := c.Conn.InsertSessionEnd(sessionID, timestamp)
	if err != nil {
		return err
	}
	c.DeleteSession(sessionID)
	// session, err := c.GetSession(sessionID)
	// if err != nil {
	// 	return err
	// }
	// session.Duration = &duration
	return nil
}


func (c *PGCache) InsertIssueEvent(sessionID uint64, crash *IssueEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertIssueEvent(sessionID, session.ProjectID, crash)
}
