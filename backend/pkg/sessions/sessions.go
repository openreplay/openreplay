package sessions

import (
	"github.com/jackc/pgx/v4"
	"log"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/metrics/database"
	"time"

	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/url"
)

type Sessions interface {
	Add(session *Session) error
	AddUnStarted(session *UnStartedSession) error
	Get(sessionID uint64) (*Session, error)
	GetUpdated(sessionID uint64) (*Session, error)
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
	db       pool.Pool         // pg connection
	cache    Cache             // in-memory or redis cache
	projects projects.Projects // projects module
	updates  map[uint64]*sessionUpdates
}

func New(db pool.Pool, proj projects.Projects, redis *redis.Client) Sessions {
	sessions := &sessionsImpl{
		db:       db,
		cache:    NewInMemoryCache(),
		projects: proj,
		updates:  make(map[uint64]*sessionUpdates),
	}
	if redis != nil {
		sessions.cache = NewCache(redis)
	}
	return sessions
}

// Add usage: /start endpoint in http service
func (s *sessionsImpl) Add(session *Session) error {
	if cachedSession, err := s.cache.Get(session.SessionID); err != nil {
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
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
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
	newDuration, err := s.insertSessionEnd(sessionID, timestamp)
	if err != nil {
		return 0, err
	}
	session, err := s.cache.Get(sessionID)
	if err != nil {
		session, err = s.getFromDB(sessionID)
		if err != nil {
			return 0, err
		}
	}

	session.Duration = &newDuration
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
	return newDuration, nil
}

// UpdateEncryptionKey usage: in ender to update session encryption key if encryption is enabled
func (s *sessionsImpl) UpdateEncryptionKey(sessionID uint64, key []byte) error {
	if err := s.insertSessionEncryptionKey(sessionID, key); err != nil {
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
	if _, ok := s.updates[sessionID]; !ok {
		s.updates[sessionID] = NewSessionUpdates(sessionID)
	}
	s.updates[sessionID].setUserID(userID)
	return nil
}

func (s *sessionsImpl) _updateUserID(sessionID uint64, userID string) error {
	if err := s.insertUserID(sessionID, userID); err != nil {
		return err
	}
	if session, err := s.cache.Get(sessionID); err != nil {
		session.UserID = &userID
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

// UpdateAnonymousID usage: in db handler
func (s *sessionsImpl) UpdateAnonymousID(sessionID uint64, userAnonymousID string) error {
	if _, ok := s.updates[sessionID]; !ok {
		s.updates[sessionID] = NewSessionUpdates(sessionID)
	}
	s.updates[sessionID].setAnonID(userAnonymousID)
	return nil
}

func (s *sessionsImpl) _updateAnonymousID(sessionID uint64, userAnonymousID string) error {
	if err := s.insertUserAnonymousID(sessionID, userAnonymousID); err != nil {
		return err
	}
	if session, err := s.cache.Get(sessionID); err != nil {
		session.UserAnonymousID = &userAnonymousID
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

// UpdateReferrer usage: in db handler on each page event
func (s *sessionsImpl) UpdateReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	baseReferrer := url.DiscardURLQuery(referrer)
	if _, ok := s.updates[sessionID]; !ok {
		s.updates[sessionID] = NewSessionUpdates(sessionID)
	}
	s.updates[sessionID].setReferrer(referrer, baseReferrer)
	return nil
}

func (s *sessionsImpl) _updateReferrer(sessionID uint64, referrer string) error {
	baseReferrer := url.DiscardURLQuery(referrer)
	if err := s.insertReferrer(sessionID, referrer, baseReferrer); err != nil {
		return err
	}
	if session, err := s.cache.Get(sessionID); err != nil {
		session.Referrer = &referrer
		session.ReferrerBase = &baseReferrer
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

	if _, ok := s.updates[sessionID]; !ok {
		s.updates[sessionID] = NewSessionUpdates(sessionID)
	}
	s.updates[sessionID].setMetadata(keyNo, value)
	return nil
}

func (s *sessionsImpl) _updateMetadata(sessionID uint64, key, value string) error {
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
	if err := s.cache.Set(session); err != nil {
		log.Printf("Failed to cache session: %v", err)
	}
	return nil
}

func (s *sessionsImpl) UpdateEventsStats(sessionID uint64, events, pages int) error {
	if _, ok := s.updates[sessionID]; !ok {
		s.updates[sessionID] = NewSessionUpdates(sessionID)
	}
	s.updates[sessionID].addEvents(pages, events)
	return nil
}

func (s *sessionsImpl) UpdateIssuesStats(sessionID uint64, errors, issueScore int) error {
	if _, ok := s.updates[sessionID]; !ok {
		s.updates[sessionID] = NewSessionUpdates(sessionID)
	}
	s.updates[sessionID].addIssues(errors, issueScore)
	return nil
}

func (s *sessionsImpl) Commit() {
	b := &pgx.Batch{}
	for _, upd := range s.updates {
		if str, args := upd.request(); str != "" {
			b.Queue(str, args...)
		}
	}
	// Record batch size
	database.RecordBatchElements(float64(b.Len()))

	start := time.Now()

	// Send batch to db and execute
	br := s.db.SendBatch(b)
	l := b.Len()
	failed := false
	for i := 0; i < l; i++ {
		if _, err := br.Exec(); err != nil {
			log.Printf("Error in PG batch.Exec(): %v \n", err)
			failed = true
			break
		}
	}
	if err := br.Close(); err != nil {
		log.Printf("Error in PG batch.Close(): %v \n", err)
	}
	if failed {
		for _, upd := range s.updates {
			if str, args := upd.request(); str != "" {
				if err := s.db.Exec(str, args...); err != nil {
					log.Printf("Error in PG Exec(): %v \n", err)
				}
			}
		}
	}
	database.RecordBatchInsertDuration(float64(time.Now().Sub(start).Milliseconds()))
	s.updates = make(map[uint64]*sessionUpdates)
}
