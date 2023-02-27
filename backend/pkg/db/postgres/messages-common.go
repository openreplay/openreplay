package postgres

import (
	"fmt"
	"log"
	"strings"

	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
)

func getAutocompleteType(baseType string, platform string) string {
	if platform == "web" {
		return baseType
	}
	return baseType + "_" + strings.ToUpper(platform)

}

func (conn *Conn) InsertSessionStart(sessionID uint64, s *types.Session) error {
	return conn.c.Exec(`
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
			NULLIF(LEFT($19, 8000), '')
		)`,
		sessionID, s.ProjectID, s.Timestamp,
		s.UserUUID, s.UserDevice, s.UserDeviceType, s.UserCountry,
		s.UserOS, s.UserOSVersion,
		s.RevID,
		s.TrackerVersion, s.Timestamp/1000,
		s.Platform,
		s.UserAgent, s.UserBrowser, s.UserBrowserVersion, s.UserDeviceMemorySize, s.UserDeviceHeapSize,
		s.UserID,
	)
}

func (conn *Conn) HandleSessionStart(sessionID uint64, s *types.Session) error {
	conn.insertAutocompleteValue(sessionID, s.ProjectID, getAutocompleteType("USEROS", s.Platform), s.UserOS)
	conn.insertAutocompleteValue(sessionID, s.ProjectID, getAutocompleteType("USERDEVICE", s.Platform), s.UserDevice)
	conn.insertAutocompleteValue(sessionID, s.ProjectID, getAutocompleteType("USERCOUNTRY", s.Platform), s.UserCountry)
	conn.insertAutocompleteValue(sessionID, s.ProjectID, getAutocompleteType("REVID", s.Platform), s.RevID)
	// s.Platform == "web"
	conn.insertAutocompleteValue(sessionID, s.ProjectID, "USERBROWSER", s.UserBrowser)
	return nil
}

func (conn *Conn) GetSessionDuration(sessionID uint64) (uint64, error) {
	var dur uint64
	if err := conn.c.QueryRow("SELECT COALESCE( duration, 0 ) FROM sessions WHERE session_id=$1", sessionID).Scan(&dur); err != nil {
		return 0, err
	}
	return dur, nil
}

func (conn *Conn) InsertSessionEnd(sessionID uint64, timestamp uint64) (uint64, error) {
	var dur uint64
	if err := conn.c.QueryRow(`
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

func (conn *Conn) InsertSessionEncryptionKey(sessionID uint64, key []byte) error {
	return conn.c.Exec(`UPDATE sessions SET file_key = $2 WHERE session_id = $1`, sessionID, string(key))
}

func (conn *Conn) HandleSessionEnd(sessionID uint64) error {
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
	WHERE session_id = $1
	`
	return conn.c.Exec(sqlRequest, sessionID)
}

func (conn *Conn) InsertRequest(sessionID uint64, timestamp uint64, index uint32, url string, duration uint64, success bool) error {
	if err := conn.bulks.Get("requests").Append(sessionID, timestamp, index, url, duration, success); err != nil {
		return fmt.Errorf("insert request in bulk err: %s", err)
	}
	return nil
}

func (conn *Conn) InsertCustomEvent(sessionID uint64, timestamp uint64, index uint32, name string, payload string) error {
	if err := conn.bulks.Get("customEvents").Append(sessionID, timestamp, index, name, payload); err != nil {
		return fmt.Errorf("insert custom event in bulk err: %s", err)
	}
	return nil
}

func (conn *Conn) InsertUserID(sessionID uint64, userID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_id = LEFT($1, 8000)
		WHERE session_id = $2`
	conn.batchQueue(sessionID, sqlRequest, userID, sessionID)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(userID)+8)
	return nil
}

func (conn *Conn) InsertUserAnonymousID(sessionID uint64, userAnonymousID string) error {
	sqlRequest := `
		UPDATE sessions SET  user_anonymous_id = $1
		WHERE session_id = $2`
	conn.batchQueue(sessionID, sqlRequest, userAnonymousID, sessionID)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(userAnonymousID)+8)
	return nil
}

func (conn *Conn) InsertMetadata(sessionID uint64, keyNo uint, value string) error {
	sqlRequest := `
		UPDATE sessions SET  metadata_%v = LEFT($1, 8000)
		WHERE session_id = $2`
	return conn.c.Exec(fmt.Sprintf(sqlRequest, keyNo), value, sessionID)
}

func (conn *Conn) InsertIssueEvent(sessionID uint64, projectID uint32, e *messages.IssueEvent) error {
	issueID := hashid.IssueID(projectID, e)
	payload := &e.Payload
	if *payload == "" || *payload == "{}" {
		payload = nil
	}

	if err := conn.bulks.Get("webIssues").Append(projectID, issueID, e.Type, e.ContextString); err != nil {
		log.Printf("insert web issue err: %s", err)
	}
	if err := conn.bulks.Get("webIssueEvents").Append(sessionID, issueID, e.Timestamp, truncSqIdx(e.MessageID), payload); err != nil {
		log.Printf("insert web issue event err: %s", err)
	}
	conn.updateSessionIssues(sessionID, 0, getIssueScore(e))
	if e.Type == "custom" {
		if err := conn.bulks.Get("webCustomEvents").Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, e.ContextString, e.Payload, "error"); err != nil {
			log.Printf("insert web custom event err: %s", err)
		}
	}
	return nil
}
