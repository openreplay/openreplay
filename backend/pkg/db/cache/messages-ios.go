package cache

import (
	"fmt"
	. "openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
)

func (c *PGCache) InsertIOSSessionStart(s *IOSSessionStart) error {
	sessionID := s.SessionID()
	if c.Cache.HasSession(sessionID) {
		return fmt.Errorf("session %d already in cache", sessionID)
	}
	newSess := &Session{
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
	c.Cache.SetSession(newSess)
	if err := c.Conn.InsertSessionStart(sessionID, newSess); err != nil {
		// don't know why?
		c.Cache.SetSession(nil)
		return err
	}
	return nil
}

func (c *PGCache) InsertIOSSessionEnd(e *IOSSessionEnd) error {
	sessionID := e.SessionID()
	_, err := c.InsertSessionEnd(sessionID, e.Timestamp)
	return err
}

func (c *PGCache) InsertIOSScreenEnter(screenEnter *IOSScreenEnter) error {
	sessionID := screenEnter.SessionID()
	if err := c.Conn.InsertIOSScreenEnter(screenEnter); err != nil {
		return err
	}
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	session.PagesCount += 1
	return nil
}

func (c *PGCache) InsertIOSClickEvent(clickEvent *IOSClickEvent) error {
	sessionID := clickEvent.SessionID()
	if err := c.Conn.InsertIOSClickEvent(clickEvent); err != nil {
		return err
	}
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	session.EventsCount += 1
	return nil
}

func (c *PGCache) InsertIOSInputEvent(inputEvent *IOSInputEvent) error {
	sessionID := inputEvent.SessionID()
	if err := c.Conn.InsertIOSInputEvent(inputEvent); err != nil {
		return err
	}
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	session.EventsCount += 1
	return nil
}

func (c *PGCache) InsertIOSCrash(crash *IOSCrash) error {
	sessionID := crash.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	if err := c.Conn.InsertIOSCrash(session.ProjectID, crash); err != nil {
		return err
	}
	session.ErrorsCount += 1
	return nil
}
