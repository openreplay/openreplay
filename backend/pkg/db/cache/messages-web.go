package cache

import (
	"errors"
	. "openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
)

func (c *PGCache) InsertWebSessionStart(sessionID uint64, s *SessionStart) error {
	return c.Conn.InsertSessionStart(sessionID, &Session{
		SessionID:      sessionID,
		Platform:       "web",
		Timestamp:      s.Timestamp,
		ProjectID:      uint32(s.ProjectID),
		TrackerVersion: s.TrackerVersion,
		RevID:          s.RevID,
		UserUUID:       s.UserUUID,
		UserOS:         s.UserOS,
		UserOSVersion:  s.UserOSVersion,
		UserDevice:     s.UserDevice,
		UserCountry:    s.UserCountry,
		// web properties (TODO: unite different platform types)
		UserAgent:            s.UserAgent,
		UserBrowser:          s.UserBrowser,
		UserBrowserVersion:   s.UserBrowserVersion,
		UserDeviceType:       s.UserDeviceType,
		UserDeviceMemorySize: s.UserDeviceMemorySize,
		UserDeviceHeapSize:   s.UserDeviceHeapSize,
		UserID:               &s.UserID,
	})
}

func (c *PGCache) HandleWebSessionStart(sessionID uint64, s *SessionStart) error {
	if c.sessions[sessionID] != nil {
		return errors.New("This session already in cache!")
	}
	c.sessions[sessionID] = &Session{
		SessionID:      sessionID,
		Platform:       "web",
		Timestamp:      s.Timestamp,
		ProjectID:      uint32(s.ProjectID),
		TrackerVersion: s.TrackerVersion,
		RevID:          s.RevID,
		UserUUID:       s.UserUUID,
		UserOS:         s.UserOS,
		UserOSVersion:  s.UserOSVersion,
		UserDevice:     s.UserDevice,
		UserCountry:    s.UserCountry,
		// web properties (TODO: unite different platform types)
		UserAgent:            s.UserAgent,
		UserBrowser:          s.UserBrowser,
		UserBrowserVersion:   s.UserBrowserVersion,
		UserDeviceType:       s.UserDeviceType,
		UserDeviceMemorySize: s.UserDeviceMemorySize,
		UserDeviceHeapSize:   s.UserDeviceHeapSize,
		UserID:               &s.UserID,
	}
	if err := c.Conn.HandleSessionStart(sessionID, c.sessions[sessionID]); err != nil {
		c.sessions[sessionID] = nil
		return err
	}
	return nil
}

func (c *PGCache) InsertWebSessionEnd(sessionID uint64, e *SessionEnd) error {
	_, err := c.InsertSessionEnd(sessionID, e.Timestamp)
	return err
}

func (c *PGCache) HandleWebSessionEnd(sessionID uint64, e *SessionEnd) error {
	return c.HandleSessionEnd(sessionID)
}

func (c *PGCache) InsertWebErrorEvent(sessionID uint64, e *ErrorEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	if err := c.Conn.InsertWebErrorEvent(sessionID, session.ProjectID, e); err != nil {
		return err
	}
	session.ErrorsCount += 1
	return nil
}

func (c *PGCache) InsertSessionReferrer(sessionID uint64, referrer string) error {
	_, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertSessionReferrer(sessionID, referrer)
}

func (c *PGCache) InsertWebFetchEvent(sessionID uint64, e *FetchEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	project, err := c.GetProject(session.ProjectID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebFetchEvent(sessionID, session.ProjectID, project.SaveRequestPayloads, e)
}

func (c *PGCache) InsertWebGraphQLEvent(sessionID uint64, e *GraphQLEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	project, err := c.GetProject(session.ProjectID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebGraphQLEvent(sessionID, session.ProjectID, project.SaveRequestPayloads, e)
}

func (c *PGCache) InsertWebCustomEvent(sessionID uint64, e *CustomEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebCustomEvent(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertWebUserID(sessionID uint64, userID *UserID) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebUserID(sessionID, session.ProjectID, userID)
}

func (c *PGCache) InsertWebUserAnonymousID(sessionID uint64, userAnonymousID *UserAnonymousID) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebUserAnonymousID(sessionID, session.ProjectID, userAnonymousID)
}

func (c *PGCache) InsertWebPageEvent(sessionID uint64, e *PageEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebPageEvent(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertWebClickEvent(sessionID uint64, e *ClickEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebClickEvent(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertWebInputEvent(sessionID uint64, e *InputEvent) error {
	session, err := c.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebInputEvent(sessionID, session.ProjectID, e)
}
