package postgres

import (
	"log"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertWebCustomEvent(sessionID uint64, projectID uint32, e *messages.CustomEvent) error {
	err := conn.InsertCustomEvent(
		sessionID,
		e.Meta().Timestamp,
		truncSqIdx(e.Meta().Index),
		e.Name,
		e.Payload,
	)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, projectID, "CUSTOM", e.Name)
	}
	return err
}

func (conn *Conn) InsertWebUserID(sessionID uint64, projectID uint32, userID *messages.UserID) error {
	err := conn.Sessions.InsertUserID(sessionID, userID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, projectID, "USERID", userID.ID)
	}
	return err
}

func (conn *Conn) InsertWebUserAnonymousID(sessionID uint64, projectID uint32, userAnonymousID *messages.UserAnonymousID) error {
	err := conn.Sessions.InsertUserAnonymousID(sessionID, userAnonymousID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, projectID, "USERANONYMOUSID", userAnonymousID.ID)
	}
	return err
}

func (conn *Conn) InsertWebPageEvent(sessionID uint64, projectID uint32, e *messages.PageEvent) error {
	host, path, query, err := url.GetURLParts(e.URL)
	if err != nil {
		return err
	}
	// base_path is deprecated
	if err = conn.bulks.Get("webPageEvents").Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, e.Referrer, url.DiscardURLQuery(e.Referrer),
		host, path, query, e.DomContentLoadedEventEnd, e.LoadEventEnd, e.ResponseEnd, e.FirstPaint, e.FirstContentfulPaint,
		e.SpeedIndex, e.VisuallyComplete, e.TimeToInteractive, calcResponseTime(e), calcDomBuildingTime(e)); err != nil {
		log.Printf("insert web page event in bulk err: %s", err)
	}
	if err = conn.Sessions.InsertReferrer(sessionID, e.Referrer); err != nil {
		log.Printf("insert session referrer err: %s", err)
	}
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sessionID, 1, 1)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sessionID, projectID, "LOCATION", url.DiscardURLQuery(path))
	conn.insertAutocompleteValue(sessionID, projectID, "REFERRER", url.DiscardURLQuery(e.Referrer))
	return nil
}

func (conn *Conn) InsertWebClickEvent(sessionID uint64, projectID uint32, e *messages.MouseClick) error {
	if e.Label == "" {
		return nil
	}
	var host, path string
	host, path, _, _ = url.GetURLParts(e.Url)
	if err := conn.bulks.Get("webClickEvents").Append(sessionID, truncSqIdx(e.MsgID()), e.Timestamp, e.Label, e.Selector, host+path, path, e.HesitationTime); err != nil {
		log.Printf("insert web click err: %s", err)
	}
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sessionID, 1, 0)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sessionID, projectID, "CLICK", e.Label)
	return nil
}

func (conn *Conn) InsertWebInputEvent(sessionID uint64, projectID uint32, e *messages.InputEvent) error {
	if e.Label == "" {
		return nil
	}
	if err := conn.bulks.Get("webInputEvents").Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, e.Label); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.updateSessionEvents(sessionID, 1, 0)
	conn.insertAutocompleteValue(sessionID, projectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebInputDuration(sessionID uint64, projectID uint32, e *messages.InputChange) error {
	if e.Label == "" {
		return nil
	}
	if err := conn.bulks.Get("webInputDurations").Append(sessionID, truncSqIdx(e.ID), e.Timestamp, e.Label, e.HesitationTime, e.InputDuration); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.updateSessionEvents(sessionID, 1, 0)
	conn.insertAutocompleteValue(sessionID, projectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebErrorEvent(sessionID uint64, projectID uint32, e *types.ErrorEvent) error {
	errorID := e.ID(projectID)
	if err := conn.bulks.Get("webErrors").Append(errorID, projectID, e.Source, e.Name, e.Message, e.Payload); err != nil {
		log.Printf("insert web error err: %s", err)
	}
	if err := conn.bulks.Get("webErrorEvents").Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, errorID); err != nil {
		log.Printf("insert web error event err: %s", err)
	}
	conn.updateSessionIssues(sessionID, 1, 1000)
	for key, value := range e.Tags {
		if err := conn.bulks.Get("webErrorTags").Append(sessionID, truncSqIdx(e.MessageID), errorID, key, value); err != nil {
			log.Printf("insert web error token err: %s", err)
		}
	}
	return nil
}

func (conn *Conn) InsertWebNetworkRequest(sessionID uint64, projectID uint32, savePayload bool, e *messages.NetworkRequest) error {
	var request, response *string
	if savePayload {
		request = &e.Request
		response = &e.Response
	}
	host, path, query, err := url.GetURLParts(e.URL)
	conn.insertAutocompleteValue(sessionID, projectID, "REQUEST", path)
	if err != nil {
		return err
	}
	conn.bulks.Get("webNetworkRequest").Append(sessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index), e.URL, host, path, query,
		request, response, e.Status, url.EnsureMethod(e.Method), e.Duration, e.Status < 400)
	return nil
}

func (conn *Conn) InsertWebGraphQL(sessionID uint64, projectID uint32, savePayload bool, e *messages.GraphQL) error {
	var request, response *string
	if savePayload {
		request = &e.Variables
		response = &e.Response
	}
	if err := conn.bulks.Get("webGraphQL").Append(sessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index), e.OperationName, request, response); err != nil {
		log.Printf("insert web graphQL event err: %s", err)
	}
	conn.insertAutocompleteValue(sessionID, projectID, "GRAPHQL", e.OperationName)
	return nil
}

func (conn *Conn) InsertMouseThrashing(sessionID uint64, projectID uint32, e *messages.MouseThrashing) error {
	issueID := hashid.MouseThrashingID(projectID, sessionID, e.Timestamp)
	if err := conn.bulks.Get("webIssues").Append(projectID, issueID, "mouse_thrashing", e.Url); err != nil {
		log.Printf("insert web issue err: %s", err)
	}
	if err := conn.bulks.Get("webIssueEvents").Append(sessionID, issueID, e.Timestamp, truncSqIdx(e.MsgID()), nil); err != nil {
		log.Printf("insert web issue event err: %s", err)
	}
	conn.updateSessionIssues(sessionID, 0, 50)
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
	conn.batchQueue(sessionID, sqlRequest,
		sessionID, timestamp, timestamp, // ??? TODO: primary key by timestamp+session_id
		p.MinFPS, p.AvgFPS, p.MaxFPS,
		p.MinCPU, p.AvgCPU, p.MinCPU,
		p.MinTotalJSHeapSize, p.AvgTotalJSHeapSize, p.MaxTotalJSHeapSize,
		p.MinUsedJSHeapSize, p.AvgUsedJSHeapSize, p.MaxUsedJSHeapSize,
	)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+8*15)
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
	conn.batchQueue(sessionID, sqlRequest,
		sessionID, e.Timestamp, truncSqIdx(e.MsgID()),
		msgType,
		e.URL, host, urlQuery,
		e.Duration != 0, 0,
		e.Duration, e.TTFB, e.HeaderSize, e.EncodedBodySize, e.DecodedBodySize,
	)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(msgType)+len(e.URL)+len(host)+len(urlQuery)+8*9+1)
	return nil
}
