package sessions

import (
	"errors"
	"fmt"
	"github.com/jackc/pgtype"
	"log"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/url"
	"sync"
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

type SessionMeta struct {
	*types.Session
	lastUse time.Time
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

//------------------------------------------------------//

var NilSessionInCacheError = errors.New("nil session in error")

func (s *sessionsImpl) SetSession(sess *types.Session) {
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

func (s *sessionsImpl) GetSession(sessionID uint64) (*types.Session, error) {
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

//------------------//

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

func (s *sessionsImpl) InsertReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	baseReferrer := url.DiscardURLQuery(referrer)
	sqlRequest := `
		UPDATE sessions SET referrer = LEFT($1, 8000), base_referrer = LEFT($2, 8000)
		WHERE session_id = $3 AND referrer IS NULL`
	s.db.BatchQueue(sessionID, sqlRequest, referrer, baseReferrer, sessionID)

	// Record approximate message size
	s.db.UpdateBatchSize(sessionID, len(sqlRequest)+len(referrer)+len(baseReferrer)+8)
	return nil
}

func (s *sessionsImpl) InsertMetadata(metadata *messages.Metadata) error {
	sessionID := metadata.SessionID()
	session, err := s.GetSession(sessionID)
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

func (s *sessionsImpl) insertMetadata(sessionID uint64, keyNo uint, value string) error {
	sqlRequest := `
		UPDATE sessions SET  metadata_%v = LEFT($1, 8000)
		WHERE session_id = $2`
	return s.db.Pool.Exec(fmt.Sprintf(sqlRequest, keyNo), value, sessionID)
}

func (s *sessionsImpl) InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_anonymous_id = $1
		WHERE session_id = $2`
	s.db.BatchQueue(sessionID, sqlRequest, userAnonymousID, sessionID)

	// Record approximate message size
	s.db.UpdateBatchSize(sessionID, len(sqlRequest)+len(userAnonymousID)+8)
	return nil
}

func (s *sessionsImpl) InsertUserID(sessionID uint64, userID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_id = LEFT($1, 8000)
		WHERE session_id = $2`
	s.db.BatchQueue(sessionID, sqlRequest, userID, sessionID)

	// Record approximate message size
	s.db.UpdateBatchSize(sessionID, len(sqlRequest)+len(userID)+8)
	return nil
}

func (s *sessionsImpl) InsertSessionEncryptionKey(sessionID uint64, key []byte) error {
	return s.db.Pool.Exec(`UPDATE sessions SET file_key = $2 WHERE session_id = $1`, sessionID, string(key))
}

func (s *sessionsImpl) GetSessionDuration(sessionID uint64) (uint64, error) {
	var dur uint64
	if err := s.db.Pool.QueryRow("SELECT COALESCE( duration, 0 ) FROM sessions WHERE session_id=$1", sessionID).Scan(&dur); err != nil {
		return 0, err
	}
	return dur, nil
}

func (s *sessionsImpl) InsertSessionEnd(sessionID uint64, timestamp uint64) (uint64, error) {
	var dur uint64
	if err := s.db.Pool.QueryRow(`
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
	return s.db.Pool.Exec(`
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
	return s.db.Pool.Exec(`
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
	sess, err := s.GetSession(sessionID)
	if err != nil {
		log.Printf("Failed to get session from postgres: %v", err)
		return nil, err
	}
	return sess, nil
}

func (s *sessionsImpl) getSession(sessionID uint64) (*types.Session, error) {
	sess := &types.Session{SessionID: sessionID}
	var revID, userOSVersion, userBrowserVersion, userState, userCity *string
	var issueTypes pgtype.EnumArray
	if err := s.db.Pool.QueryRow(`
		SELECT platform,
			duration, project_id, start_ts,
			user_uuid, user_os, user_os_version, 
			user_device, user_device_type, user_country, user_state, user_city,
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
		&sess.UserDevice, &sess.UserDeviceType, &sess.UserCountry, &userState, &userCity,
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
	if userState != nil {
		sess.UserState = *userState
	}
	if userCity != nil {
		sess.UserCity = *userCity
	}
	return sess, nil
}
