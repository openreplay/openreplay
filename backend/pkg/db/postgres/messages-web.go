package postgres

import (
	"log"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertWebCustomEvent(sess *types.Session, e *messages.CustomEvent) error {
	err := conn.InsertCustomEvent(
		sess.SessionID,
		e.Meta().Timestamp,
		truncSqIdx(e.Meta().Index),
		e.Name,
		e.Payload,
	)
	if err == nil {
		conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "CUSTOM", e.Name)
	}
	return err
}

func (conn *Conn) InsertWebUserID(sess *types.Session, userID *messages.UserID) error {
	err := conn.Sessions.InsertUserID(sess.SessionID, userID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "USERID", userID.ID)
	}
	return err
}

func (conn *Conn) InsertWebUserAnonymousID(sess *types.Session, userAnonymousID *messages.UserAnonymousID) error {
	err := conn.Sessions.InsertUserAnonymousID(sess.SessionID, userAnonymousID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "USERANONYMOUSID", userAnonymousID.ID)
	}
	return err
}

func (conn *Conn) InsertWebPageEvent(sess *types.Session, e *messages.PageEvent) error {
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
	if err = conn.Sessions.InsertReferrer(sess.SessionID, e.Referrer); err != nil {
		log.Printf("insert session referrer err: %s", err)
	}
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sess.SessionID, 1, 1)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "LOCATION", url.DiscardURLQuery(path))
	conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "REFERRER", url.DiscardURLQuery(e.Referrer))
	return nil
}

func (conn *Conn) InsertWebClickEvent(sess *types.Session, e *messages.MouseClick) error {
	if e.Label == "" {
		return nil
	}
	var host, path string
	host, path, _, _ = url.GetURLParts(e.Url)
	if err := conn.bulks.Get("webClickEvents").Append(sess.SessionID, truncSqIdx(e.MsgID()), e.Timestamp, e.Label, e.Selector, host+path, path, e.HesitationTime); err != nil {
		log.Printf("insert web click err: %s", err)
	}
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sess.SessionID, 1, 0)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "CLICK", e.Label)
	return nil
}

func (conn *Conn) InsertWebInputEvent(sess *types.Session, e *messages.InputEvent) error {
	if e.Label == "" {
		return nil
	}
	if err := conn.bulks.Get("webInputEvents").Append(sess.SessionID, truncSqIdx(e.MessageID), e.Timestamp, e.Label); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.updateSessionEvents(sess.SessionID, 1, 0)
	conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebInputDuration(sess *types.Session, e *messages.InputChange) error {
	if e.Label == "" {
		return nil
	}
	if err := conn.bulks.Get("webInputDurations").Append(sess.SessionID, truncSqIdx(e.ID), e.Timestamp, e.Label, e.HesitationTime, e.InputDuration); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.updateSessionEvents(sess.SessionID, 1, 0)
	conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebErrorEvent(sess *types.Session, e *types.ErrorEvent) error {
	errorID := e.ID(sess.ProjectID)
	if err := conn.bulks.Get("webErrors").Append(errorID, sess.ProjectID, e.Source, e.Name, e.Message, e.Payload); err != nil {
		log.Printf("insert web error err: %s", err)
	}
	if err := conn.bulks.Get("webErrorEvents").Append(sess.SessionID, truncSqIdx(e.MessageID), e.Timestamp, errorID); err != nil {
		log.Printf("insert web error event err: %s", err)
	}
	sess.ErrorsCount += 1 // TODO: why here?
	conn.updateSessionIssues(sess.SessionID, 1, 1000)
	for key, value := range e.Tags {
		if err := conn.bulks.Get("webErrorTags").Append(sess.SessionID, truncSqIdx(e.MessageID), errorID, key, value); err != nil {
			log.Printf("insert web error token err: %s", err)
		}
	}
	return nil
}

func (conn *Conn) InsertWebNetworkRequest(sess *types.Session, e *messages.NetworkRequest) error {
	var request, response *string
	if sess.SaveRequestPayload {
		request = &e.Request
		response = &e.Response
	}
	host, path, query, err := url.GetURLParts(e.URL)
	conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "REQUEST", path)
	if err != nil {
		return err
	}
	conn.bulks.Get("webNetworkRequest").Append(sess.SessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index), e.URL, host, path, query,
		request, response, e.Status, url.EnsureMethod(e.Method), e.Duration, e.Status < 400)
	return nil
}

func (conn *Conn) InsertWebGraphQL(sess *types.Session, e *messages.GraphQL) error {
	var request, response *string
	if sess.SaveRequestPayload {
		request = &e.Variables
		response = &e.Response
	}
	if err := conn.bulks.Get("webGraphQL").Append(sess.SessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index), e.OperationName, request, response); err != nil {
		log.Printf("insert web graphQL event err: %s", err)
	}
	conn.insertAutocompleteValue(sess.SessionID, sess.ProjectID, "GRAPHQL", e.OperationName)
	return nil
}

func (conn *Conn) InsertMouseThrashing(sess *types.Session, e *messages.MouseThrashing) error {
	issueID := hashid.MouseThrashingID(sess.ProjectID, sess.SessionID, e.Timestamp)
	if err := conn.bulks.Get("webIssues").Append(sess.ProjectID, issueID, "mouse_thrashing", e.Url); err != nil {
		log.Printf("insert web issue err: %s", err)
	}
	if err := conn.bulks.Get("webIssueEvents").Append(sess.SessionID, issueID, e.Timestamp, truncSqIdx(e.MsgID()), nil); err != nil {
		log.Printf("insert web issue event err: %s", err)
	}
	conn.updateSessionIssues(sess.SessionID, 0, 50)
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
