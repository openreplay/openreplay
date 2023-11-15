package sessions

import (
	"log"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/url"
)

type Sessions interface {
	Add(session *Session) error
	AddUnStarted(session *UnStartedSession) error
	AddCached(sessionID uint64, data map[string]string) error
	Get(sessionID uint64) (*Session, error)
	GetUpdated(sessionID uint64) (*Session, error)
	GetCached(sessionID uint64) (map[string]string, error)
	GetDuration(sessionID uint64) (uint64, error)
	UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error)
	UpdateEncryptionKey(sessionID uint64, key []byte) error
	UpdateUserID(sessionID uint64, userID string) error
	UpdateAnonymousID(sessionID uint64, userAnonymousID string) error
	UpdateReferrer(sessionID uint64, referrer string) error
	UpdateMetadata(sessionID uint64, key, value string) error
	UpdateEventsStats(sessionID uint64, events, pages int) error
	UpdateIssuesStats(sessionID uint64, errors, issueScore int) error
	Commit()
}

type sessionsImpl struct {
	cache    Cache
	storage  Storage
	updates  Updates
	projects projects.Projects
}

func New(db pool.Pool, proj projects.Projects, redis *redis.Client) Sessions {
	return &sessionsImpl{
		cache:    NewInMemoryCache(NewCache(redis)),
		storage:  NewStorage(db),
		updates:  NewSessionUpdates(db),
		projects: proj,
	}
}

// Add usage: /start endpoint in http service
func (s *sessionsImpl) Add(session *Session) error {
	if cachedSession, err := s.cache.Get(session.SessionID); err == nil {
		log.Printf("[!] Session %d already exists in cache, new: %+v, cached: %+v", session.SessionID, session, cachedSession)
	}
	err := s.storage.Add(session)
	if err != nil {
		return err
	}
	proj, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return err
	}
	session.SaveRequestPayload = proj.SaveRequestPayloads
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
	return nil
}

// AddUnStarted usage: /not-started endpoint in http service
func (s *sessionsImpl) AddUnStarted(sess *UnStartedSession) error {
	return s.storage.AddUnStarted(sess)
}

func (s *sessionsImpl) getFromDB(sessionID uint64) (*Session, error) {
	session, err := s.storage.Get(sessionID)
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
	if sess, err := s.cache.Get(sessionID); err == nil {
		return sess, nil
	}

	// Get from postgres and update in-memory and redis caches
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return nil, err
	}
	s.cache.Set(session)
	return session, nil
}

// Special method for clickhouse connector
func (s *sessionsImpl) GetUpdated(sessionID uint64) (*Session, error) {
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return nil, err
	}
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
	return session, nil
}

func (s *sessionsImpl) AddCached(sessionID uint64, data map[string]string) error {
	return s.cache.SetCache(sessionID, data)
}

func (s *sessionsImpl) GetCached(sessionID uint64) (map[string]string, error) {
	return s.cache.GetCache(sessionID)
}

// GetDuration usage: in ender to check current and new duration to avoid duplicates
func (s *sessionsImpl) GetDuration(sessionID uint64) (uint64, error) {
	if sess, err := s.cache.Get(sessionID); err == nil {
		if sess.Duration != nil {
			return *sess.Duration, nil
		}
		return 0, nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return 0, err
	}
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
	if session.Duration != nil {
		return *session.Duration, nil
	}
	return 0, nil
}

// UpdateDuration usage: in ender to update session duration
func (s *sessionsImpl) UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error) {
	newDuration, err := s.storage.UpdateDuration(sessionID, timestamp)
	if err != nil {
		return 0, err
	}
	// Update session info in cache for future usage (for example in connectors)
	session, err := s.getFromDB(sessionID)
	if err != nil {
		return 0, err
	}

	session.Duration = &newDuration
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
	return newDuration, nil
}

// UpdateEncryptionKey usage: in ender to update session encryption key if encryption is enabled
func (s *sessionsImpl) UpdateEncryptionKey(sessionID uint64, key []byte) error {
	if err := s.storage.InsertEncryptionKey(sessionID, key); err != nil {
		return err
	}
	if session, err := s.cache.Get(sessionID); err != nil {
		session.EncryptionKey = string(key)
		if err := s.cache.Set(session); err != nil {
			log.Printf("Failed to cache session: %v", err)
		}
		return nil
	}
	session, err := s.getFromDB(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil
	}
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
	return nil
}

// UpdateUserID usage: in db handler
func (s *sessionsImpl) UpdateUserID(sessionID uint64, userID string) error {
	s.updates.AddUserID(sessionID, userID)
	return nil
}

// UpdateAnonymousID usage: in db handler
func (s *sessionsImpl) UpdateAnonymousID(sessionID uint64, userAnonymousID string) error {
	s.updates.AddUserID(sessionID, userAnonymousID)
	return nil
}

// UpdateReferrer usage: in db handler on each page event
func (s *sessionsImpl) UpdateReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	baseReferrer := url.DiscardURLQuery(referrer)
	s.updates.SetReferrer(sessionID, referrer, baseReferrer)
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

	s.updates.SetMetadata(sessionID, keyNo, value)
	return nil
}

func (s *sessionsImpl) UpdateEventsStats(sessionID uint64, events, pages int) error {
	s.updates.AddEvents(sessionID, events, pages)
	return nil
}

func (s *sessionsImpl) UpdateIssuesStats(sessionID uint64, errors, issueScore int) error {
	s.updates.AddIssues(sessionID, errors, issueScore)
	return nil
}

func (s *sessionsImpl) Commit() {
	s.updates.Commit()
}
