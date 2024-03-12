package postgres

import (
	"fmt"
	"log"
	"strings"

	"openreplay/backend/internal/http/geoip"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/url"
)

func getAutocompleteType(baseType string, platform string) string {
	if platform == "web" {
		return baseType
	}
	return baseType + "_" + strings.ToUpper(platform)

}

func (conn *Conn) HandleStartEvent(s *messages.SessionStart) error {
	sessionID := s.SessionID()
	projectID := uint32(s.ProjectID)
	platform := "web"
	geoInfo := geoip.UnpackGeoRecord(s.UserCountry)
	conn.InsertAutocompleteValue(sessionID, projectID, getAutocompleteType("USEROS", platform), s.UserOS)
	conn.InsertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERDEVICE", platform), s.UserDevice)
	conn.InsertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERCOUNTRY", platform), geoInfo.Country)
	conn.InsertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERSTATE", platform), geoInfo.State)
	conn.InsertAutocompleteValue(sessionID, projectID, getAutocompleteType("USERCITY", platform), geoInfo.City)
	conn.InsertAutocompleteValue(sessionID, projectID, getAutocompleteType("REVID", platform), s.RevID)
	conn.InsertAutocompleteValue(sessionID, projectID, "USERBROWSER", s.UserBrowser)
	return nil
}

func (conn *Conn) HandleEndEvent(sessionID uint64) error {
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
	return conn.Pool.Exec(sqlRequest, sessionID)
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

func (conn *Conn) InsertIssueEvent(sess *sessions.Session, e *messages.IssueEvent) error {
	issueID := hashid.IssueID(sess.ProjectID, e)
	payload := &e.Payload
	if *payload == "" || *payload == "{}" {
		payload = nil
	}

	if e.Type == "app_crash" {
		log.Printf("app crash event: %+v", e)
		return nil
	}

	if err := conn.bulks.Get("webIssues").Append(sess.ProjectID, issueID, e.Type, e.ContextString); err != nil {
		log.Printf("insert web issue err: %s", err)
	}
	if err := conn.bulks.Get("webIssueEvents").Append(sess.SessionID, issueID, e.Timestamp, truncSqIdx(e.MessageID), payload); err != nil {
		log.Printf("insert web issue event err: %s", err)
	}
	if e.Type == "custom" {
		if err := conn.bulks.Get("webCustomEvents").Append(sess.SessionID, truncSqIdx(e.MessageID), e.Timestamp, e.ContextString, e.Payload, "error"); err != nil {
			log.Printf("insert web custom event err: %s", err)
		}
	}
	return nil
}

func (conn *Conn) InsertWebCustomEvent(sess *sessions.Session, e *messages.CustomEvent) error {
	err := conn.InsertCustomEvent(
		sess.SessionID,
		e.Meta().Timestamp,
		truncSqIdx(e.Meta().Index),
		e.Name,
		e.Payload,
	)
	if err == nil {
		conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "CUSTOM", e.Name)
	}
	return err
}

func (conn *Conn) InsertWebPageEvent(sess *sessions.Session, e *messages.PageEvent) error {
	host, path, query, err := url.GetURLParts(e.URL)
	if err != nil {
		return err
	}
	// base_path is deprecated
	if err = conn.bulks.Get("webPageEvents").Append(sess.SessionID, truncSqIdx(e.MessageID), e.Timestamp, e.Referrer, url.DiscardURLQuery(e.Referrer),
		host, path, query, e.DomContentLoadedEventEnd, e.LoadEventEnd, e.ResponseEnd, e.FirstPaint, e.FirstContentfulPaint,
		e.SpeedIndex, e.VisuallyComplete, e.TimeToInteractive, calcResponseTime(e), calcDomBuildingTime(e)); err != nil {
		log.Printf("insert web page event in bulk err: %s", err)
	}
	// Add new value set to autocomplete bulk
	location := path
	if query != "" {
		location += "?" + query
	}
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "LOCATION", location)
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "REFERRER", url.DiscardURLQuery(e.Referrer))
	return nil
}

func (conn *Conn) InsertWebClickEvent(sess *sessions.Session, e *messages.MouseClick) error {
	if e.Label == "" {
		return nil
	}
	var host, path string
	host, path, _, _ = url.GetURLParts(e.Url)
	if err := conn.bulks.Get("webClickEvents").Append(sess.SessionID, truncSqIdx(e.MsgID()), e.Timestamp, e.Label, e.Selector, host+path, path, e.HesitationTime); err != nil {
		log.Printf("insert web click err: %s", err)
	}
	// Add new value set to autocomplete bulk
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "CLICK", e.Label)
	return nil
}

func (conn *Conn) InsertInputChangeEvent(sess *sessions.Session, e *messages.InputChange) error {
	if e.Label == "" {
		return nil
	}
	if e.HesitationTime > 2147483647 {
		e.HesitationTime = 0
	}
	if e.InputDuration > 2147483647 {
		e.InputDuration = 0
	}
	if err := conn.bulks.Get("webInputDurations").Append(sess.SessionID, truncSqIdx(e.ID), e.Timestamp, e.Label, e.HesitationTime, e.InputDuration); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebErrorEvent(sess *sessions.Session, e *types.ErrorEvent) error {
	errorID := e.ID(sess.ProjectID)
	if err := conn.bulks.Get("webErrors").Append(errorID, sess.ProjectID, e.Source, e.Name, e.Message, e.Payload); err != nil {
		log.Printf("insert web error err: %s", err)
	}
	if err := conn.bulks.Get("webErrorEvents").Append(sess.SessionID, truncSqIdx(e.MessageID), e.Timestamp, errorID); err != nil {
		log.Printf("insert web error event err: %s", err)
	}
	for key, value := range e.Tags {
		if err := conn.bulks.Get("webErrorTags").Append(sess.SessionID, truncSqIdx(e.MessageID), errorID, key, value); err != nil {
			log.Printf("insert web error token err: %s", err)
		}
	}
	return nil
}

func (conn *Conn) InsertWebNetworkRequest(sess *sessions.Session, e *messages.NetworkRequest) error {
	var request, response *string
	if sess.SaveRequestPayload {
		request = &e.Request
		response = &e.Response
	}
	host, path, query, err := url.GetURLParts(e.URL)
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "REQUEST", path)
	if err != nil {
		return err
	}
	conn.bulks.Get("webNetworkRequest").Append(sess.SessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index), e.URL, host, path, query,
		request, response, e.Status, url.EnsureMethod(e.Method), e.Duration, e.Status < 400, e.TransferredBodySize)
	return nil
}

func (conn *Conn) InsertWebGraphQL(sess *sessions.Session, e *messages.GraphQL) error {
	var request, response *string
	if sess.SaveRequestPayload {
		request = &e.Variables
		response = &e.Response
	}
	if err := conn.bulks.Get("webGraphQL").Append(sess.SessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index), e.OperationName, request, response); err != nil {
		log.Printf("insert web graphQL event err: %s", err)
	}
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "GRAPHQL", e.OperationName)
	return nil
}

func (conn *Conn) InsertMouseThrashing(sess *sessions.Session, e *messages.MouseThrashing) error {
	issueID := hashid.MouseThrashingID(sess.ProjectID, sess.SessionID, e.Timestamp)
	if err := conn.bulks.Get("webIssues").Append(sess.ProjectID, issueID, "mouse_thrashing", e.Url); err != nil {
		log.Printf("insert web issue err: %s", err)
	}
	if err := conn.bulks.Get("webIssueEvents").Append(sess.SessionID, issueID, e.Timestamp, truncSqIdx(e.MsgID()), nil); err != nil {
		log.Printf("insert web issue event err: %s", err)
	}
	return nil
}

func (conn *Conn) InsertCanvasNode(sess *sessions.Session, m *messages.CanvasNode) error {
	canvasID := fmt.Sprintf("%d_%s", m.Timestamp, m.NodeId)
	if err := conn.bulks.Get("canvasNodes").Append(sess.SessionID, canvasID, m.Timestamp); err != nil {
		log.Printf("insert canvas node %s to db, err: %s", canvasID, err)
	}
	return nil
}

func (conn *Conn) InsertTagTrigger(sess *sessions.Session, m *messages.TagTrigger) error {
	if err := conn.bulks.Get("tagTriggers").Append(sess.SessionID, m.Timestamp, truncSqIdx(m.Index), m.TagId); err != nil {
		log.Printf("insert tag trigger %d to db, err: %s", m.TagId, err)
	}
	return nil
}

func (conn *Conn) InsertWebStatsPerformance(p *messages.PerformanceTrackAggr) error {
	sessionID := p.SessionID()
	timestamp := (p.TimestampEnd + p.TimestampStart) / 2

	sqlRequest := `
		INSERT INTO events.performance (
			session_id, timestamp, message_id,
			min_fps, avg_fps, max_fps,
			min_cpu, avg_cpu, max_cpu,
			min_total_js_heap_size, avg_total_js_heap_size, max_total_js_heap_size,
			min_used_js_heap_size, avg_used_js_heap_size, max_used_js_heap_size
		) VALUES (
			$1, $2, $3,
			$4, $5, $6,
			$7, $8, $9,
			$10, $11, $12,
			$13, $14, $15
		)`
	conn.BatchQueue(sessionID, sqlRequest,
		sessionID, timestamp, timestamp, // ??? TODO: primary key by timestamp+session_id
		p.MinFPS, p.AvgFPS, p.MaxFPS,
		p.MinCPU, p.AvgCPU, p.MinCPU,
		p.MinTotalJSHeapSize, p.AvgTotalJSHeapSize, p.MaxTotalJSHeapSize,
		p.MinUsedJSHeapSize, p.AvgUsedJSHeapSize, p.MaxUsedJSHeapSize,
	)
	return nil
}

func (conn *Conn) InsertWebStatsResourceEvent(e *messages.ResourceTiming) error {
	sessionID := e.SessionID()
	host, _, _, err := url.GetURLParts(e.URL)
	if err != nil {
		return err
	}
	msgType := url.GetResourceType(e.Initiator, e.URL)
	sqlRequest := `
		INSERT INTO events.resources (
			session_id, timestamp, message_id, 
			type,
			url, url_host, url_hostpath,
			success, status, 
			duration, ttfb, header_size, encoded_body_size, decoded_body_size
		) VALUES (
			$1, $2, $3, 
			$4, 
			LEFT($5, 8000), LEFT($6, 300), LEFT($7, 2000), 
			$8, $9, 
			NULLIF($10, 0), NULLIF($11, 0), NULLIF($12, 0), NULLIF($13, 0), NULLIF($14, 0)
		)`
	urlQuery := url.DiscardURLQuery(e.URL)
	conn.BatchQueue(sessionID, sqlRequest,
		sessionID, e.Timestamp, truncSqIdx(e.MsgID()),
		msgType,
		e.URL, host, urlQuery,
		e.Duration != 0, 0,
		e.Duration, e.TTFB, e.HeaderSize, e.EncodedBodySize, e.DecodedBodySize,
	)
	return nil
}
