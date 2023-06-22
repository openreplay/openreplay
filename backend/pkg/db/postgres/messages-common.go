package postgres

import (
	"fmt"
	"log"
	"openreplay/backend/internal/http/geoip"
	"strings"

	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
)

func getAutocompleteType(baseType string, platform string) string {
	if platform == "web" {
		return baseType
	}
	return baseType + "_" + strings.ToUpper(platform)

}

func (conn *Conn) HandleSessionStart(s *messages.SessionStart) error {
	sessionID := s.SessionID()
	projectID := uint32(s.ProjectID)
	platform := "web"
	geoInfo := geoip.UnpackGeoRecord(s.UserCountry)
	conn.insertAutocompleteValue(sessionID, projectID, getAutocompleteType("USEROS", platform), s.UserOS)
	conn.insertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERDEVICE", platform), s.UserDevice)
	conn.insertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERCOUNTRY", platform), geoInfo.Country)
	conn.insertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERSTATE", platform), geoInfo.State)
	conn.insertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERCITY", platform), geoInfo.City)
	conn.insertAutocompleteValue(sessionID, projectID, getAutocompleteType("REVID", platform), s.RevID)
	conn.insertAutocompleteValue(sessionID, projectID, "USERBROWSER", s.UserBrowser)
	return nil
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
