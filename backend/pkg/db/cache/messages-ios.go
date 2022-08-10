package cache

import (
	"errors"
	. "openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
)

func (c *PGCache) InsertIOSSessionStart(sessionID uint64, s *IOSSessionStart) error {
	if c.sessions[sessionID] != nil {
		return errors.New("This session already in cache!")
	}
	c.sessions[sessionID] = &Session{
		SessionID:      sessionID,
		Platform:       "ios",
		Timestamp:      s.Timestamp,
		ProjectID:      uint32(s.ProjectID),
		TrackerVersion: s.TrackerVersion,
		RevID:          s.RevID,
		UserUUID:       s.UserUUID,
		UserOS:         s.UserOS,
		UserOSVersion:  s.UserOSVersion,
		UserDevice:     s.UserDevice,
		UserCountry:    s.UserCountry,
		UserDeviceType: s.UserDeviceType,
	}
	if err := c.Conn.InsertSessionStart(sessionID, c.sessions[sessionID]); err != nil {
		c.sessions[sessionID] = nil
		return err
	}
	return nil
}

func (c *PGCache) InsertIOSSessionEnd(sessionID uint64, e *IOSSessionEnd) error {
	_, err := c.InsertSessionEnd(sessionID, e.Timestamp)
	return err
}

func (c *PGCache) InsertIOSScreenEnter(sessionID uint64, screenEnter *IOSScreenEnter) error {
	if err := c.Conn.InsertIOSScreenEnter(sessionID, screenEnter); err != nil {
		return err
	}
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	session.PagesCount += 1
	return nil
}

func (c *PGCache) InsertIOSClickEvent(sessionID uint64, clickEvent *IOSClickEvent) error {
	if err := c.Conn.InsertIOSClickEvent(sessionID, clickEvent); err != nil {
		return err
	}
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	session.EventsCount += 1
	return nil
}

func (c *PGCache) InsertIOSInputEvent(sessionID uint64, inputEvent *IOSInputEvent) error {
	if err := c.Conn.InsertIOSInputEvent(sessionID, inputEvent); err != nil {
		return err
	}
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	session.EventsCount += 1
	return nil
}

func (c *PGCache) InsertIOSCrash(sessionID uint64, crash *IOSCrash) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	if err := c.Conn.InsertIOSCrash(sessionID, session.ProjectID, crash); err != nil {
		return err
	}
	session.ErrorsCount += 1
	return nil
}

func (c *PGCache) InsertIOSIssueEvent(sessionID uint64, issueEvent *IOSIssueEvent) error {
	return nil
}
