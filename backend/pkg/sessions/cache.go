package sessions

import (
	"errors"
	"log"
	"openreplay/backend/pkg/db/postgres"
	"time"
)

type SessionMeta struct {
	*Session
	lastUse time.Time
}

var NilSessionInCacheError = errors.New("nil session in error")

func (s *sessionsImpl) SetSession(sess *Session) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if meta, ok := s.sessions[sess.SessionID]; ok {
		meta.Session = sess
		meta.lastUse = time.Now()
	} else {
		s.sessions[sess.SessionID] = &SessionMeta{sess, time.Now()}
	}
}

func (s *sessionsImpl) HasSession(sessID uint64) bool {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	sess, ok := s.sessions[sessID]
	return ok && sess.Session != nil
}

func (s *sessionsImpl) GetSession(sessionID uint64) (*Session, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if sess, inCache := s.sessions[sessionID]; inCache {
		if sess.Session == nil {
			return nil, NilSessionInCacheError
		}
		return sess.Session, nil
	}
	sess, err := s.getSession(sessionID)
	if postgres.IsNoRowsErr(err) {
		s.sessions[sessionID] = &SessionMeta{nil, time.Now()}
	}
	if err != nil {
		return nil, err
	}

	proj, err := s.projects.GetProject(sess.ProjectID)
	if err != nil {
		log.Printf("can't get project info: %v", err)
		return nil, err
	}
	sess.SaveRequestPayload = proj.SaveRequestPayloads
	s.sessions[sessionID] = &SessionMeta{sess, time.Now()}
	return sess, nil
}

func (s *sessionsImpl) cleaner() {
	cleanTick := time.Tick(time.Minute * 5)
	for {
		select {
		case <-cleanTick:
			s.clearCache()
		}
	}
}

func (s *sessionsImpl) clearCache() {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	cacheSize := len(s.sessions)
	deleted := 0
	for id, sess := range s.sessions {
		if now.Sub(sess.lastUse).Minutes() > 3 {
			deleted++
			delete(s.sessions, id)
		}
	}
	log.Printf("cache cleaner: deleted %d/%d sessions", deleted, cacheSize)
}
