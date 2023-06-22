package sessions

import (
	"fmt"
	"github.com/jackc/pgtype"
	"log"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
	"time"
)

// Data flow: [in-memory cache] -- { [redis (optional)] -- [postgres] }

type Sessions interface {
	Add(session *types.Session) error
	AddUnStarted(session *UnStartedSession) error
	Get(sessionID uint64) (*types.Session, error)
	InsertSessionEnd(sessionID uint64, timestamp uint64) (uint64, error)
	GetSessionDuration(sessionID uint64) (uint64, error)
	InsertSessionEncryptionKey(sessionID uint64, key []byte) error
	InsertUserID(sessionID uint64, userID string) error
	InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error
	InsertMetadata(metadata *messages.Metadata) error
	InsertReferrer(sessionID uint64, referrer string) error
}

type sessionsImpl struct {
	db postgres.Pool
}

func New(db postgres.Pool) Sessions {
	return &sessionsImpl{db}
}

type UnStartedSession struct {
	ProjectKey         string
	TrackerVersion     string
	DoNotTrack         bool
	Platform           string
	UserAgent          string
	UserOS             string
	UserOSVersion      string
	UserBrowser        string
	UserBrowserVersion string
	UserDevice         string
	UserDeviceType     string
	UserCountry        string
	UserState          string
	UserCity           string
}

// TODO: found without using anywhere
func (conn *Conn) InsertSessionReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	return conn.c.Exec(`
		UPDATE sessions 
		SET referrer = LEFT($1, 8000), base_referrer = LEFT($2, 8000)
		WHERE session_id = $3 AND referrer IS NULL`,
		referrer, url.DiscardURLQuery(referrer), sessionID)
}

func (s *sessionsImpl) InsertReferrer(sessionID uint64, referrer string) error {
	baseReferrer := url.DiscardURLQuery(referrer)
	sqlRequest := `
		UPDATE sessions SET referrer = LEFT($1, 8000), base_referrer = LEFT($2, 8000)
		WHERE session_id = $3`
	conn.batchQueue(sessionID, sqlRequest, referrer, baseReferrer, sessionID)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(referrer)+len(baseReferrer)+8)
	return nil
}

func (s *sessionsImpl) InsertMetadata(metadata *messages.Metadata) error {
	sessionID := metadata.SessionID()
	session, err := c.Cache.GetSession(sessionID)
	if err != nil {
		return err
	}
	project, err := c.Cache.GetProject(session.ProjectID)
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

func (s *sessionsImpl) insertMetadata(sessionID uint64, keyNo uint, value string) error {
	sqlRequest := `
		UPDATE sessions SET  metadata_%v = LEFT($1, 8000)
		WHERE session_id = $2`
	return s.db.Exec(fmt.Sprintf(sqlRequest, keyNo), value, sessionID)
}

func (s *sessionsImpl) InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_anonymous_id = $1
		WHERE session_id = $2`
	conn.batchQueue(sessionID, sqlRequest, userAnonymousID, sessionID)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(userAnonymousID)+8)
	return nil
}

func (s *sessionsImpl) InsertUserID(sessionID uint64, userID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_id = LEFT($1, 8000)
		WHERE session_id = $2`
	conn.batchQueue(sessionID, sqlRequest, userID, sessionID)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(userID)+8)
	return nil
}

func (s *sessionsImpl) InsertSessionEncryptionKey(sessionID uint64, key []byte) error {
	return s.db.Exec(`UPDATE sessions SET file_key = $2 WHERE session_id = $1`, sessionID, string(key))
}

func (s *sessionsImpl) GetSessionDuration(sessionID uint64) (uint64, error) {
	var dur uint64
	if err := s.db.QueryRow("SELECT COALESCE( duration, 0 ) FROM sessions WHERE session_id=$1", sessionID).Scan(&dur); err != nil {
		return 0, err
	}
	return dur, nil
}

func (s *sessionsImpl) InsertSessionEnd(sessionID uint64, timestamp uint64) (uint64, error) {
	var dur uint64
	if err := s.db.QueryRow(`
		UPDATE sessions SET duration=$2 - start_ts
		WHERE session_id=$1
		RETURNING duration
	`,
		sessionID, timestamp,
	).Scan(&dur); err != nil {
		return 0, err
	}
	return dur, nil
}

func (s *sessionsImpl) AddUnStarted(sess *UnStartedSession) error {
	return s.db.Exec(`
		INSERT INTO unstarted_sessions (
			project_id, 
			tracker_version, do_not_track, 
			platform, user_agent, 
			user_os, user_os_version, 
			user_browser, user_browser_version,
			user_device, user_device_type, 
			user_country, user_state, user_city
		) VALUES (
			(SELECT project_id FROM projects WHERE project_key = $1), 
			$2, $3,
			$4, $5, 
			$6, $7, 
			$8, $9,
			$10, $11,
			$12, NULLIF($13, ''), NULLIF($14, '')
		)`,
		sess.ProjectKey,
		sess.TrackerVersion, sess.DoNotTrack,
		sess.Platform, sess.UserAgent,
		sess.UserOS, sess.UserOSVersion,
		sess.UserBrowser, sess.UserBrowserVersion,
		sess.UserDevice, sess.UserDeviceType,
		sess.UserCountry, sess.UserState, sess.UserCity,
	)
}

func (s *sessionsImpl) Add(session *types.Session) error {
	// TODO: add to redis (with 2 hours expiration)
	/*
		geoInfo := geoip.UnpackGeoRecord(s.UserCountry)
			newSess := &Session{
				SessionID:            sessionID,
				Platform:             "web",
				Timestamp:            s.Timestamp,
				ProjectID:            uint32(s.ProjectID),
				TrackerVersion:       s.TrackerVersion,
				RevID:                s.RevID,
				UserUUID:             s.UserUUID,
				UserOS:               s.UserOS,
				UserOSVersion:        s.UserOSVersion,
				UserDevice:           s.UserDevice,
				UserCountry:          geoInfo.Country,
				UserState:            geoInfo.State,
				UserCity:             geoInfo.City,
				UserAgent:            s.UserAgent,
				UserBrowser:          s.UserBrowser,
				UserBrowserVersion:   s.UserBrowserVersion,
				UserDeviceType:       s.UserDeviceType,
				UserDeviceMemorySize: s.UserDeviceMemorySize,
				UserDeviceHeapSize:   s.UserDeviceHeapSize,
				UserID:               &s.UserID,
			}
			c.Cache.SetSession(newSess)
	*/
	return s.addSession(session)
}

func (s *sessionsImpl) addSession(sess *types.Session) error {
	return s.db.Exec(`
		INSERT INTO sessions (
			session_id, project_id, start_ts,
			user_uuid, user_device, user_device_type, user_country,
			user_os, user_os_version,
			rev_id, 
			tracker_version, issue_score,
			platform,
			user_agent, user_browser, user_browser_version, user_device_memory_size, user_device_heap_size,
			user_id, user_state, user_city
		) VALUES (
			$1, $2, $3,
			$4, $5, $6, $7, 
			$8, NULLIF($9, ''),
			NULLIF($10, ''), 
			$11, $12,
			$13,
			NULLIF($14, ''), NULLIF($15, ''), NULLIF($16, ''), NULLIF($17, 0), NULLIF($18, 0::bigint),
			NULLIF(LEFT($19, 8000), ''), NULLIF($20, ''), NULLIF($21, '')
		)`,
		sess.SessionID, sess.ProjectID, sess.Timestamp,
		sess.UserUUID, sess.UserDevice, sess.UserDeviceType, sess.UserCountry,
		sess.UserOS, sess.UserOSVersion,
		sess.RevID,
		sess.TrackerVersion, sess.Timestamp/1000,
		sess.Platform,
		sess.UserAgent, sess.UserBrowser, sess.UserBrowserVersion, sess.UserDeviceMemorySize, sess.UserDeviceHeapSize,
		sess.UserID, sess.UserState, sess.UserCity,
	)
}

func (s *sessionsImpl) Get(sessionID uint64) (*types.Session, error) {
	// TODO: get from redis
	sess, err := s.getSession(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil, err
	}
	// TODO: add to redis (with 2 hours expiration)
	// TODO: add to cache
	return sess, nil
}

func (s *sessionsImpl) getSession(sessionID uint64) (*types.Session, error) {
	sess := &types.Session{SessionID: sessionID}
	var revID, userOSVersion, userBrowserVersion *string
	var issueTypes pgtype.EnumArray
	if err := s.db.QueryRow(`
		SELECT platform,
			duration, project_id, start_ts,
			user_uuid, user_os, user_os_version, 
			user_device, user_device_type, user_country,
			rev_id, tracker_version,
			user_id, user_anonymous_id, referrer,
			pages_count, events_count, errors_count, issue_types,
			user_browser, user_browser_version, issue_score,
			metadata_1, metadata_2, metadata_3, metadata_4, metadata_5,
			metadata_6, metadata_7, metadata_8, metadata_9, metadata_10
		FROM sessions
		WHERE session_id=$1 
	`,
		sessionID,
	).Scan(&sess.Platform,
		&sess.Duration, &sess.ProjectID, &sess.Timestamp,
		&sess.UserUUID, &sess.UserOS, &userOSVersion,
		&sess.UserDevice, &sess.UserDeviceType, &sess.UserCountry,
		&revID, &sess.TrackerVersion,
		&sess.UserID, &sess.UserAnonymousID, &sess.Referrer,
		&sess.PagesCount, &sess.EventsCount, &sess.ErrorsCount, &issueTypes,
		&sess.UserBrowser, &userBrowserVersion, &sess.IssueScore,
		&sess.Metadata1, &sess.Metadata2, &sess.Metadata3, &sess.Metadata4, &sess.Metadata5,
		&sess.Metadata6, &sess.Metadata7, &sess.Metadata8, &sess.Metadata9, &sess.Metadata10); err != nil {
		return nil, err
	}
	if userOSVersion != nil {
		sess.UserOSVersion = *userOSVersion
	}
	if userBrowserVersion != nil {
		sess.UserBrowserVersion = *userBrowserVersion
	}
	if revID != nil {
		sess.RevID = *revID
	}
	if err := issueTypes.AssignTo(&sess.IssueTypes); err != nil {
		log.Printf("can't scan IssueTypes, err: %s", err)
	}
	return sess, nil
}
