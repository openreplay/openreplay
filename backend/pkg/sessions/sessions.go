package sessions

import (
	"log"
	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/url"
	"time"
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
	UpdateMetadata(metadata *messages.Metadata) error
}

type sessionsImpl struct {
	db       *postgres.Conn
	projects projects.Projects
	cache    cache.Cache
}

func New(db *postgres.Conn, proj projects.Projects) Sessions {
	sessions := &sessionsImpl{
		db:       db,
		projects: proj,
		cache:    cache.New(time.Minute*5, time.Minute*3),
	}
	return sessions
}

func (s *sessionsImpl) Add(session *Session) error {
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

func (s *sessionsImpl) AddUnStarted(sess *UnStartedSession) error {
	return s.addUnStarted(sess)
}

func (s *sessionsImpl) Get(sessionID uint64) (*Session, error) {
	if sess, ok := s.cache.GetAndRefresh(sessionID); ok {
		return sess.(*Session), nil
	}
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
	s.cache.Set(session.SessionID, session)
	return session, nil
}

func (s *sessionsImpl) GetDuration(sessionID uint64) (uint64, error) {
	return s.getSessionDuration(sessionID)
}

func (s *sessionsImpl) UpdateDuration(sessionID uint64, timestamp uint64) (uint64, error) {
	return s.insertSessionEnd(sessionID, timestamp)
}

func (s *sessionsImpl) UpdateEncryptionKey(sessionID uint64, key []byte) error {
	return s.insertSessionEncryptionKey(sessionID, key)
}

func (s *sessionsImpl) UpdateUserID(sessionID uint64, userID string) error {
	return s.insertUserID(sessionID, userID)
}

func (s *sessionsImpl) UpdateAnonymousID(sessionID uint64, userAnonymousID string) error {
	return s.insertMetadata(sessionID, 1, userAnonymousID)
}

func (s *sessionsImpl) UpdateReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	baseReferrer := url.DiscardURLQuery(referrer)
	return s.insertReferrer(sessionID, referrer, baseReferrer)
}

func (s *sessionsImpl) UpdateMetadata(metadata *messages.Metadata) error {
	sessionID := metadata.SessionID()
	session, err := s.Get(sessionID)
	if err != nil {
		return err
	}
	project, err := s.projects.GetProject(session.ProjectID)
	if err != nil {
		return err
	}

	keyNo := project.GetMetadataNo(metadata.Key)

	if keyNo == 0 {
		// TODO: insert project metadata
		return nil
	}
	if err := s.insertMetadata(sessionID, keyNo, metadata.Value); err != nil {
		// Try to insert metadata after one minute
		time.AfterFunc(time.Minute, func() {
			if err := s.insertMetadata(sessionID, keyNo, metadata.Value); err != nil {
				log.Printf("metadata retry err: %s", err)
			}
		})
		return err
	}
	session.SetMetadata(keyNo, metadata.Value)
	return nil
}
