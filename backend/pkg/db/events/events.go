package events

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (e *eventsImpl) InsertPageEvent(sessionID uint64, evt *messages.PageEvent) error {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}
	host, path, query, err := url.GetURLParts(evt.URL)
	if err != nil {
		return err
	}
	// base_path is deprecated
	if err = e.webPageEvents.Append(sessionID, evt.MessageID, evt.Timestamp, evt.Referrer, url.DiscardURLQuery(evt.Referrer),
		host, path, query, evt.DomContentLoadedEventEnd, evt.LoadEventEnd, evt.ResponseEnd, evt.FirstPaint, evt.FirstContentfulPaint,
		evt.SpeedIndex, evt.VisuallyComplete, evt.TimeToInteractive, calcResponseTime(evt), calcDomBuildingTime(evt)); err != nil {
		log.Printf("insert web page event in bulk err: %s", err)
	}
	// Accumulate session updates and exec inside batch with another sql commands
	e.batches.UpdateSessionEvents(sessionID, 1, 1)
	// Add new value set to autocomplete bulk
	e.autocompletes.InsertValue(sessionID, session.ProjectID, "LOCATION", url.DiscardURLQuery(path))
	e.autocompletes.InsertValue(sessionID, session.ProjectID, "REFERRER", url.DiscardURLQuery(evt.Referrer))
	return nil
}

func (e *eventsImpl) InsertClickEvent(sessionID uint64, evt *messages.ClickEvent) error {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}
	sqlRequest := `
		INSERT INTO events.clicks
			(session_id, message_id, timestamp, label, selector, url)
		(SELECT
			$1, $2, $3, NULLIF($4, ''), $5, host || path
			FROM events.pages
			WHERE session_id = $1 AND timestamp <= $3 ORDER BY timestamp DESC LIMIT 1
		)
		`
	e.batches.Queue(sessionID, sqlRequest, sessionID, evt.MessageID, evt.Timestamp, evt.Label, evt.Selector)
	// Accumulate session updates and exec inside batch with another sql commands
	e.batches.UpdateSessionEvents(sessionID, 1, 0)
	// Add new value set to autocomplete bulk
	e.autocompletes.InsertValue(sessionID, session.ProjectID, "CLICK", evt.Label)
	return nil
}

func (e *eventsImpl) InsertInputEvent(sessionID uint64, evt *messages.InputEvent) error {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}
	if evt.Label == "" {
		return nil
	}
	value := &evt.Value
	if evt.ValueMasked {
		value = nil
	}
	if err := e.webInputEvents.Append(sessionID, evt.MessageID, evt.Timestamp, value, evt.Label); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	e.batches.UpdateSessionEvents(sessionID, 1, 0)
	e.autocompletes.InsertValue(sessionID, session.ProjectID, "INPUT", evt.Label)
	return nil
}

func (e *eventsImpl) InsertIssueEvent(sessionID uint64, evt *messages.IssueEvent) (err error) {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}
	tx, err := e.db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Printf("rollback err: %s", rollbackErr)
			}
		}
	}()
	issueID := hashid.IssueID(session.ProjectID, evt)

	// TEMP. TODO: nullable & json message field type
	payload := &evt.Payload
	if *payload == "" || *payload == "{}" {
		payload = nil
	}
	context := &evt.Context
	if *context == "" || *context == "{}" {
		context = nil
	}

	if err = tx.Exec(`
		INSERT INTO issues (
			project_id, issue_id, type, context_string, context
		) (SELECT
			project_id, $2, $3, $4, CAST($5 AS jsonb)
			FROM sessions-builder
			WHERE session_id = $1
		)ON CONFLICT DO NOTHING`,
		sessionID, issueID, evt.Type, evt.ContextString, context,
	); err != nil {
		return err
	}
	if err = tx.Exec(`
		INSERT INTO events_common.issues (
			session_id, issue_id, timestamp, seq_index, payload
		) VALUES (
			$1, $2, $3, $4, CAST($5 AS jsonb)
		)`,
		sessionID, issueID, evt.Timestamp,
		getSqIdx(evt.MessageID),
		payload,
	); err != nil {
		return err
	}
	if err = tx.Exec(`
		UPDATE sessions-builder SET issue_score = issue_score + $2
		WHERE session_id = $1`,
		sessionID, getIssueScore(evt),
	); err != nil {
		return err
	}
	// TODO: no redundancy. Deliver to UI in a different way
	if evt.Type == "custom" {
		if err = tx.Exec(`
			INSERT INTO events_common.customs
				(session_id, seq_index, timestamp, name, payload, level)
			VALUES
				($1, $2, $3, left($4, 2700), $5, 'error')
			`,
			sessionID, getSqIdx(evt.MessageID), evt.Timestamp, evt.ContextString, evt.Payload,
		); err != nil {
			return err
		}
	}
	err = tx.Commit()
	return
}

func (e *eventsImpl) InsertErrorEvent(sessionID uint64, evt *messages.ErrorEvent) (err error) {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}
	tx, err := e.db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Printf("rollback err: %s", rollbackErr)
			}
		}
	}()
	errorID := hashid.WebErrorID(session.ProjectID, evt)

	if err = tx.Exec(`
		INSERT INTO errors
			(error_id, project_id, source, name, message, payload)
		VALUES
			($1, $2, $3, $4, $5, $6::jsonb)
		ON CONFLICT DO NOTHING`,
		errorID, session.ProjectID, evt.Source, evt.Name, evt.Message, evt.Payload,
	); err != nil {
		return err
	}
	if err = tx.Exec(`
		INSERT INTO events.errors
			(session_id, message_id, timestamp, error_id)
		VALUES
			($1, $2, $3, $4)
		`,
		sessionID, evt.MessageID, evt.Timestamp, errorID,
	); err != nil {
		return err
	}
	if err = tx.Exec(`
		UPDATE sessions-builder SET errors_count = errors_count + 1, issue_score = issue_score + 1000
		WHERE session_id = $1`,
		sessionID,
	); err != nil {
		return err
	}
	err = tx.Commit()
	session.ErrorsCount += 1
	return
}

func (e *eventsImpl) InsertFetchEvent(sessionID uint64, evt *messages.FetchEvent) error {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}
	var request, response *string
	if session.SaveRequestPayload {
		request = &evt.Request
		response = &evt.Response
	}
	host, path, query, err := url.GetURLParts(evt.URL)
	e.autocompletes.InsertValue(sessionID, session.ProjectID, "REQUEST", path)
	if err != nil {
		return err
	}

	sqlRequest := `
		INSERT INTO events_common.requests (
			session_id, timestamp, seq_index, 
			url, host, path, query,
			request_body, response_body, status_code, method,
			duration, success
		) VALUES (
			$1, $2, $3, 
			left($4, 2700), $5, $6, $7,
			$8, $9, $10::smallint, NULLIF($11, '')::http_method,
			$12, $13
		) ON CONFLICT DO NOTHING`
	e.batches.Queue(sessionID, sqlRequest,
		sessionID, evt.Timestamp, getSqIdx(evt.MessageID),
		evt.URL, host, path, query,
		request, response, evt.Status, url.EnsureMethod(evt.Method),
		evt.Duration, evt.Status < 400,
	)

	// Record approximate message size
	e.batches.UpdateSize(sessionID, len(sqlRequest)+len(evt.URL)+len(host)+len(path)+len(query)+
		len(evt.Request)+len(evt.Response)+len(url.EnsureMethod(evt.Method))+8*5+1)
	return nil
}

func (e *eventsImpl) InsertGraphQLEvent(sessionID uint64, evt *messages.GraphQLEvent) error {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}

	var request, response *string
	if session.SaveRequestPayload {
		request = &evt.Variables
		response = &evt.Response
	}
	if err := e.webGraphQLEvents.Append(sessionID, evt.Timestamp, evt.MessageID, evt.OperationName, request, response); err != nil {
		log.Printf("insert web graphQL event err: %s", err)
	}
	e.autocompletes.InsertValue(sessionID, session.ProjectID, "GRAPHQL", evt.OperationName)
	return nil
}

func (e *eventsImpl) InsertCustomEvent(sessionID uint64, evt *messages.CustomEvent) error {
	session, err := e.sessions.GetSession(sessionID)
	if err != nil {
		return err
	}
	if err = e.customEvents.Append(sessionID, evt.Timestamp, getSqIdx(evt.MessageID), evt.Name, evt.Payload); err != nil {
		return fmt.Errorf("insert custom event in bulk err: %s", err)
	} else {
		e.autocompletes.InsertValue(sessionID, session.ProjectID, "CUSTOM", evt.Name)
	}
	return err
}

func (e *eventsImpl) InsertRequest(sessionID uint64, timestamp uint64, index uint64, url string, duration uint64, success bool) error {
	if err := e.requests.Append(sessionID, timestamp, getSqIdx(index), url, duration, success); err != nil {
		return fmt.Errorf("insert request in bulk err: %s", err)
	}
	return nil
}
