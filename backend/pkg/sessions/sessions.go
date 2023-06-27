package sessions

import (
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
	"time"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/url"
)

type Sessions interface {
	Add(session *Session) error
	AddUnStarted(session *UnStartedSession) error
	Get(sessionID uint64) (*Session, error)
	GetDuration(sessionID uint64) (uint64, error)
	UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error)
	UpdateEncryptionKey(sessionID uint64, key []byte) error
	UpdateUserID(sessionID uint64, userID string) error
	UpdateAnonymousID(sessionID uint64, userAnonymousID string) error
	UpdateReferrer(sessionID uint64, referrer string) error
	UpdateMetadata(sessionID uint64, key, value string) error
}

type sessionsImpl struct {
	db       pool.Pool
	projects projects.Projects
	cache    cache.Cache
}

func New(db pool.Pool, proj projects.Projects) Sessions {
	sessions := &sessionsImpl{
		db:       db,
		projects: proj,
		cache:    cache.New(time.Minute*5, time.Minute*3),
	}
	return sessions
}

// Add usage: /start endpoint in http service
func (s *sessionsImpl) Add(session *Session) error {
	if cachedSession, ok := s.cache.GetAndRefresh(session.SessionID); ok {
		log.Printf("[!] Session %d already exists in cache, new: %+v, cached: %+v", session.SessionID, session, cachedSession)
	}
	err := s.addSession(session)
	if err != nil {
		return err
	}
	proj, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return err
	}
	session.SaveRequestPayload = proj.SaveRequestPayloads
	s.cache.Set(session.SessionID, session)
	return nil
}

// AddUnStarted usage: /not-started endpoint in http service
func (s *sessionsImpl) AddUnStarted(sess *UnStartedSession) error {
	return s.addUnStarted(sess)
}

func (s *sessionsImpl) getFromDB(sessionID uint64) (*Session, error) {
	session, err := s.getSession(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil, err
	}
	proj, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return nil, err
	}
	session.SaveRequestPayload = proj.SaveRequestPayloads
	return session, nil
}

// Get usage: db message processor + connectors in feature
func (s *sessionsImpl) Get(sessionID uint64) (*Session, error) {
	if sess, ok := s.cache.GetAndRefresh(sessionID); ok {
		return sess.(*Session), nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return nil, err
	}
	s.cache.Set(session.SessionID, session)
	return session, nil
}

// GetDuration usage: in ender to check current and new duration to avoid duplicates
func (s *sessionsImpl) GetDuration(sessionID uint64) (uint64, error) {
	sess, ok := s.cache.GetAndRefresh(sessionID)
	if ok {
		session := sess.(*Session)
		if session.Duration != nil {
			return *session.Duration, nil
		} else {
			dur, err := s.getSessionDuration(sessionID)
			if err != nil {
				return 0, err
			}
			if dur != 0 {
				session.Duration = &dur
				s.cache.Set(session.SessionID, session)
				return dur, nil
			}
			return 0, nil
		}
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return 0, err
	}
	s.cache.Set(session.SessionID, session)
	if session.Duration == nil {
		return 0, nil
	}
	return *session.Duration, nil
}

// UpdateDuration usage: in ender to update session duration
func (s *sessionsImpl) UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error) {
	newDuration, err := s.insertSessionEnd(sessionID, timestamp)
	if err != nil {
		return 0, err
	}
	rawSession, ok := s.cache.GetAndRefresh(sessionID)
	if !ok {
		rawSession, err = s.getFromDB(sessionID)
		if err != nil {
			return 0, err
		}
	}
	session := rawSession.(*Session)
	session.Duration = &newDuration
	s.cache.Set(session.SessionID, session)
	return newDuration, nil
}

// UpdateEncryptionKey usage: in ender to update session encryption key if encryption is enabled
func (s *sessionsImpl) UpdateEncryptionKey(sessionID uint64, key []byte) error {
	if err := s.insertSessionEncryptionKey(sessionID, key); err != nil {
		return err
	}
	if sess, ok := s.cache.Get(sessionID); ok {
		session := sess.(*Session)
		session.EncryptionKey = string(key)
		s.cache.Set(sessionID, session)
		return nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil
	}
	s.cache.Set(session.SessionID, session)
	return nil
}

// UpdateUserID usage: in db handler
func (s *sessionsImpl) UpdateUserID(sessionID uint64, userID string) error {
	if err := s.insertUserID(sessionID, userID); err != nil {
		return err
	}
	if sess, ok := s.cache.Get(sessionID); ok {
		session := sess.(*Session)
		session.UserID = &userID
		s.cache.Set(sessionID, session)
		return nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil
	}
	s.cache.Set(session.SessionID, session)
	return nil
}

// UpdateAnonymousID usage: in db handler
func (s *sessionsImpl) UpdateAnonymousID(sessionID uint64, userAnonymousID string) error {
	if err := s.insertUserAnonymousID(sessionID, userAnonymousID); err != nil {
		return err
	}
	if sess, ok := s.cache.Get(sessionID); ok {
		session := sess.(*Session)
		session.UserAnonymousID = &userAnonymousID
		s.cache.Set(sessionID, session)
		return nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil
	}
	s.cache.Set(session.SessionID, session)
	return nil
}

// UpdateReferrer usage: in db handler on each page event
func (s *sessionsImpl) UpdateReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	baseReferrer := url.DiscardURLQuery(referrer)
	if err := s.insertReferrer(sessionID, referrer, baseReferrer); err != nil {
		return err
	}
	if sess, ok := s.cache.Get(sessionID); ok {
		session := sess.(*Session)
		session.Referrer = &referrer
		session.ReferrerBase = &baseReferrer
		s.cache.Set(sessionID, session)
		return nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil
	}
	s.cache.Set(session.SessionID, session)
	return nil
}

// UpdateMetadata usage: in db handler on each metadata event
func (s *sessionsImpl) UpdateMetadata(sessionID uint64, key, value string) error {
	session, err := s.Get(sessionID)
	if err != nil {
		return err
	}
	project, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return err
	}

	keyNo := project.GetMetadataNo(key)
	if keyNo == 0 {
		return nil
	}
	if err := s.insertMetadata(sessionID, keyNo, value); err != nil {
		return err
	}
	session.SetMetadata(keyNo, value)
	s.cache.Set(sessionID, session)
	return nil
}
