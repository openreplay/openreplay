package postgres

import (
	"errors"
	"fmt"
	"log"
	"openreplay/backend/pkg/db/autocomplete"
	"openreplay/backend/pkg/db/batch"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/sessions/cache"
	"openreplay/backend/pkg/url"
	"strings"
	"time"
)

// Implementation of Sessions interface for Postgres
type sessionsImpl struct {
	db            postgres.Pool
	cache         cache.Sessions
	batches       batch.Batches
	autocompletes autocomplete.Autocompletes
}

func New(db postgres.Pool, cache cache.Sessions, batches batch.Batches, ac autocomplete.Autocompletes) (sessions.Sessions, error) {
	switch {
	case db == nil:
		return nil, errors.New("db is empty")
	case cache == nil:
		return nil, errors.New("cache is empty")
	case batches == nil:
		return nil, errors.New("batches is empty")
	case ac == nil:
		return nil, errors.New("autocompletes is empty")
	}
	return &sessionsImpl{
		db:            db,
		cache:         cache,
		batches:       batches,
		autocompletes: ac,
	}, nil
}

func (s *sessionsImpl) InsertSession(msg *messages.SessionStart) error {
	return s.db.Exec(`
		INSERT INTO sessions (
			session_id, project_id, start_ts,
			user_uuid, user_device, user_device_type, user_country,
			user_os, user_os_version,
			rev_id, 
			tracker_version, issue_score,
			platform,
			user_agent, user_browser, user_browser_version, user_device_memory_size, user_device_heap_size,
			user_id
		) VALUES (
			$1, $2, $3,
			$4, $5, $6, $7, 
			$8, NULLIF($9, ''),
			NULLIF($10, ''), 
			$11, $12,
			$13,
			NULLIF($14, ''), NULLIF($15, ''), NULLIF($16, ''), NULLIF($17, 0), NULLIF($18, 0::bigint),
			NULLIF($19, '')
		)`,
		msg.SessionID(), uint32(msg.ProjectID), msg.Timestamp,
		msg.UserUUID, msg.UserDevice, msg.UserDeviceType, msg.UserCountry,
		msg.UserOS, msg.UserOSVersion,
		msg.RevID,
		msg.TrackerVersion, msg.Timestamp/1000,
		"web",
		msg.UserAgent, msg.UserBrowser, msg.UserBrowserVersion, msg.UserDeviceMemorySize, msg.UserDeviceHeapSize,
		msg.UserID,
	)
}

func (s *sessionsImpl) HandleSessionStart(sess *messages.SessionStart) error {
	sessionID := sess.SessionID()
	session, err := s.handleSessionStart(sessionID, sess)
	if err != nil {
		return err
	}
	s.autocompletes.InsertValue(sessionID, session.ProjectID, getAutocompleteType("USEROS", session.Platform), session.UserOS)
	s.autocompletes.InsertValue(sessionID, session.ProjectID, getAutocompleteType("USERDEVICE", session.Platform), session.UserDevice)
	s.autocompletes.InsertValue(sessionID, session.ProjectID, getAutocompleteType("USERCOUNTRY", session.Platform), session.UserCountry)
	s.autocompletes.InsertValue(sessionID, session.ProjectID, getAutocompleteType("REVID", session.Platform), session.RevID)
	s.autocompletes.InsertValue(sessionID, session.ProjectID, "USERBROWSER", session.UserBrowser)
	return nil
}

func (s *sessionsImpl) handleSessionStart(sessionID uint64, msg *messages.SessionStart) (*sessions.Session, error) {
	if s.cache.HasSession(sessionID) {
		return nil, errors.New("this session already in cache")
	}
	newSession := &sessions.Session{
		SessionID:            sessionID,
		Platform:             "web",
		Timestamp:            msg.Timestamp,
		ProjectID:            uint32(msg.ProjectID),
		TrackerVersion:       msg.TrackerVersion,
		RevID:                msg.RevID,
		UserUUID:             msg.UserUUID,
		UserOS:               msg.UserOS,
		UserOSVersion:        msg.UserOSVersion,
		UserDevice:           msg.UserDevice,
		UserCountry:          msg.UserCountry,
		UserAgent:            msg.UserAgent,
		UserBrowser:          msg.UserBrowser,
		UserBrowserVersion:   msg.UserBrowserVersion,
		UserDeviceType:       msg.UserDeviceType,
		UserDeviceMemorySize: msg.UserDeviceMemorySize,
		UserDeviceHeapSize:   msg.UserDeviceHeapSize,
		UserID:               &msg.UserID,
	}
	s.cache.AddSession(newSession)
	return newSession, nil
}

func (s *sessionsImpl) InsertSessionEnd(e *messages.SessionEnd) error {
	sessionID := e.SessionID()
	currDuration, err := s.getSessionDuration(sessionID)
	if err != nil {
		log.Printf("getSessionDuration failed, sessID: %d, err: %s", sessionID, err)
	}
	var newDuration uint64
	if err := s.db.QueryRow(`
		UPDATE sessions SET duration=$2 - start_ts
		WHERE session_id=$1
		RETURNING duration
	`,
		sessionID, e.Timestamp,
	).Scan(&newDuration); err != nil {
		return err
	}
	if currDuration == newDuration {
		return fmt.Errorf("sessionEnd duplicate, sessID: %d, prevDur: %d, newDur: %d", sessionID,
			currDuration, newDuration)
	}
	return nil
}

func (s *sessionsImpl) getSessionDuration(sessionID uint64) (uint64, error) {
	var dur uint64
	if err := s.db.QueryRow("SELECT COALESCE( duration, 0 ) FROM sessions WHERE session_id=$1", sessionID).Scan(&dur); err != nil {
		return 0, err
	}
	return dur, nil
}

func (s *sessionsImpl) HandleSessionEnd(e *messages.SessionEnd) error {
	sqlRequest := `
	UPDATE sessions
		SET issue_types=(SELECT 
			CASE WHEN errors_count > 0 THEN
			  (COALESCE(ARRAY_AGG(DISTINCT ps.type), '{}') || 'js_exception'::issue_type)::issue_type[]
			ELSE
				(COALESCE(ARRAY_AGG(DISTINCT ps.type), '{}'))::issue_type[]
			END
    FROM events_common.issues
      INNER JOIN issues AS ps USING (issue_id)
                WHERE session_id = $1)
		WHERE session_id = $1`
	return s.db.Exec(sqlRequest, e.SessionID())
}

func (s *sessionsImpl) InsertUnStartedSession(sess *sessions.UnstartedSession) error {
	return s.db.Exec(`
		INSERT INTO unstarted_sessions (
			project_id, 
			tracker_version, do_not_track, 
			platform, user_agent, 
			user_os, user_os_version, 
			user_browser, user_browser_version,
			user_device, user_device_type, 
			user_country
		) VALUES (
			(SELECT project_id FROM projects WHERE project_key = $1), 
			$2, $3,
			$4, $5, 
			$6, $7, 
			$8, $9,
			$10, $11,
			$12
		)`,
		sess.ProjectKey,
		sess.TrackerVersion, sess.DoNotTrack,
		sess.Platform, sess.UserAgent,
		sess.UserOS, sess.UserOSVersion,
		sess.UserBrowser, sess.UserBrowserVersion,
		sess.UserDevice, sess.UserDeviceType,
		sess.UserCountry,
	)
}

func (s *sessionsImpl) InsertReferrer(sessionID uint64, referrer string) error {
	_, err := s.cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	if referrer == "" {
		return nil
	}
	return s.db.Exec(`
		UPDATE sessions 
		SET referrer = $1, base_referrer = $2
		WHERE session_id = $3 AND referrer IS NULL`,
		referrer, url.DiscardURLQuery(referrer), sessionID)
}

func (s *sessionsImpl) InsertUserID(userID *messages.UserID) error {
	sessionID := userID.SessionID()
	session, err := s.cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	err = s.insertUserID(sessionID, userID.ID)
	if err == nil {
		s.autocompletes.InsertValue(sessionID, session.ProjectID, "USERID", userID.ID)
	}
	return err
}

func (s *sessionsImpl) insertUserID(sessionID uint64, userID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_id = $1
		WHERE session_id = $2`
	s.batches.Queue(sessionID, sqlRequest, userID, sessionID)

	// Record approximate message size
	s.batches.UpdateSize(sessionID, len(sqlRequest)+len(userID)+8)
	return nil
}

func (s *sessionsImpl) InsertAnonymousUserID(userAnonymousID *messages.UserAnonymousID) error {
	sessionID := userAnonymousID.SessionID()
	session, err := s.cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	err = s.InsertUserAnonymousID(sessionID, userAnonymousID.ID)
	if err == nil {
		s.autocompletes.InsertValue(sessionID, session.ProjectID, "USERANONYMOUSID", userAnonymousID.ID)
	}
	return err
}

func (s *sessionsImpl) InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_anonymous_id = $1
		WHERE session_id = $2`
	s.batches.Queue(sessionID, sqlRequest, userAnonymousID, sessionID)

	// Record approximate message size
	s.batches.UpdateSize(sessionID, len(sqlRequest)+len(userAnonymousID)+8)
	return nil
}

func (s *sessionsImpl) InsertMetadata(metadata *messages.Metadata) error {
	sessionID := metadata.SessionID()
	session, err := s.cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	keyNo, err := s.cache.GetMetadataNo(sessionID, metadata.Key)
	if err != nil {
		return err
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

func (s *sessionsImpl) insertMetadata(sessionID uint64, keyNo uint, value string) error {
	sqlRequest := `
		UPDATE sessions SET  metadata_%v = $1
		WHERE session_id = $2`
	return s.db.Exec(fmt.Sprintf(sqlRequest, keyNo), value, sessionID)
}

func (s *sessionsImpl) GetProjectByKey(projectKey string) (*sessions.Project, error) {
	return s.cache.GetProjectByKey(projectKey)
}

func getAutocompleteType(baseType string, platform string) string {
	if platform == "web" {
		return baseType
	}
	return baseType + "_" + strings.ToUpper(platform)
}
