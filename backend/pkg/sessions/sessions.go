package sessions

import (
	"log"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/url"
	"sync"
	"time"
)

// Data flow: [in-memory cache] -- { [redis (optional)] -- [postgres] }

type Sessions interface {
	Add(session *Session) error
	AddUnStarted(session *UnStartedSession) error
	Get(sessionID uint64) (*Session, error)
	InsertSessionEnd(sessionID uint64, timestamp uint64) (uint64, error)
	GetSessionDuration(sessionID uint64) (uint64, error)
	InsertSessionEncryptionKey(sessionID uint64, key []byte) error
	InsertUserID(sessionID uint64, userID string) error
	InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error
	InsertMetadata(metadata *messages.Metadata) error
	InsertReferrer(sessionID uint64, referrer string) error
}

type sessionsImpl struct {
	db       *postgres.Conn
	mutex    sync.RWMutex
	sessions map[uint64]*SessionMeta
	projects projects.Projects
}

func New(db *postgres.Conn, proj projects.Projects) Sessions {
	sessions := &sessionsImpl{
		db:       db,
		sessions: make(map[uint64]*SessionMeta),
		projects: proj,
	}
	go sessions.cleaner()
	return sessions
}

func (s *sessionsImpl) Add(session *Session) error {
	return s.addSession(session)
}

func (s *sessionsImpl) AddUnStarted(sess *UnStartedSession) error {
	return s.addUnStarted(sess)
}

func (s *sessionsImpl) Get(sessionID uint64) (*Session, error) {
	sess, err := s.GetSession(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil, err
	}
	return sess, nil
}

func (s *sessionsImpl) InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error {
	return s.insertMetadata(sessionID, 1, userAnonymousID)
}

func (s *sessionsImpl) InsertReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	baseReferrer := url.DiscardURLQuery(referrer)
	return s.insertReferrer(sessionID, referrer, baseReferrer)
}

func (s *sessionsImpl) InsertUserID(sessionID uint64, userID string) error {
	return s.insertUserID(sessionID, userID)
}

func (s *sessionsImpl) InsertSessionEncryptionKey(sessionID uint64, key []byte) error {
	return s.insertSessionEncryptionKey(sessionID, key)
}

func (s *sessionsImpl) GetSessionDuration(sessionID uint64) (uint64, error) {
	return s.getSessionDuration(sessionID)
}

func (s *sessionsImpl) InsertSessionEnd(sessionID uint64, timestamp uint64) (uint64, error) {
	return s.insertSessionEnd(sessionID, timestamp)
}

func (s *sessionsImpl) InsertMetadata(metadata *messages.Metadata) error {
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
