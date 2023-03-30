package cache

import (
	"fmt"
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

func (c *PGCache) HandleWebSessionStart(s *SessionStart) error {
	sessionID := s.SessionID()
	if c.Cache.HasSession(sessionID) {
		return fmt.Errorf("session %d already in cache", sessionID)
	}
	newSess := &Session{
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
	c.Cache.SetSession(newSess)
	if err := c.Conn.HandleSessionStart(sessionID, newSess); err != nil {
		// don't know why?
		c.Cache.SetSession(nil)
		return err
	}
	return nil
}

func (c *PGCache) InsertWebSessionEnd(sessionID uint64, e *SessionEnd) error {
	_, err := c.InsertSessionEnd(sessionID, e.Timestamp)
	return err
}

func (c *PGCache) HandleWebSessionEnd(e *SessionEnd) error {
	sessionID := e.SessionID()
	return c.HandleSessionEnd(sessionID)
}

func (c *PGCache) InsertWebJSException(e *JSException) error {
	return c.InsertWebErrorEvent(e.SessionID(), WrapJSException(e))
}
func (c *PGCache) InsertWebIntegrationEvent(e *IntegrationEvent) error {
	return c.InsertWebErrorEvent(e.SessionID(), WrapIntegrationEvent(e))
}
func (c *PGCache) InsertWebErrorEvent(sessionID uint64, e *ErrorEvent) error {
	session, err := c.Cache.GetSession(sessionID)
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
	_, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertSessionReferrer(sessionID, referrer)
}

func (c *PGCache) InsertWebNetworkRequest(e *NetworkRequest) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	project, err := c.Cache.GetProject(session.ProjectID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebNetworkRequest(sessionID, session.ProjectID, project.SaveRequestPayloads, e)
}

func (c *PGCache) InsertWebGraphQL(e *GraphQL) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	project, err := c.Cache.GetProject(session.ProjectID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebGraphQL(sessionID, session.ProjectID, project.SaveRequestPayloads, e)
}

func (c *PGCache) InsertWebCustomEvent(e *CustomEvent) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebCustomEvent(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertWebUserID(userID *UserID) error {
	sessionID := userID.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebUserID(sessionID, session.ProjectID, userID)
}

func (c *PGCache) InsertWebUserAnonymousID(userAnonymousID *UserAnonymousID) error {
	sessionID := userAnonymousID.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebUserAnonymousID(sessionID, session.ProjectID, userAnonymousID)
}

func (c *PGCache) InsertWebPageEvent(e *PageEvent) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebPageEvent(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertWebClickEvent(e *MouseClick) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebClickEvent(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertWebInputEvent(e *InputEvent) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebInputEvent(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertWebInputDuration(e *InputChange) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertWebInputDuration(sessionID, session.ProjectID, e)
}

func (c *PGCache) InsertMouseThrashing(e *MouseThrashing) error {
	sessionID := e.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	return c.Conn.InsertMouseThrashing(sessionID, session.ProjectID, e)
}
