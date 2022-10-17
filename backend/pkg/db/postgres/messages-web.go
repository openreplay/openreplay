package postgres

import (
	"encoding/json"
	"log"

	"openreplay/backend/pkg/hashid"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertWebCustomEvent(sessionID uint64, projectID uint32, e *CustomEvent) error {
	err := conn.InsertCustomEvent(sessionID, e.Timestamp,
		e.MessageID,
		e.Name, e.Payload)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, projectID, "CUSTOM", e.Name)
	}
	return err
}

func (conn *Conn) InsertWebUserID(sessionID uint64, projectID uint32, userID *UserID) error {
	err := conn.InsertUserID(sessionID, userID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, projectID, "USERID", userID.ID)
	}
	return err
}

func (conn *Conn) InsertWebUserAnonymousID(sessionID uint64, projectID uint32, userAnonymousID *UserAnonymousID) error {
	err := conn.InsertUserAnonymousID(sessionID, userAnonymousID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, projectID, "USERANONYMOUSID", userAnonymousID.ID)
	}
	return err
}

func (conn *Conn) InsertWebPageEvent(sessionID uint64, projectID uint32, e *PageEvent) error {
	host, path, query, err := url.GetURLParts(e.URL)
	if err != nil {
		return err
	}
	// base_path is deprecated
	if err = conn.webPageEvents.Append(sessionID, e.MessageID, e.Timestamp, e.Referrer, url.DiscardURLQuery(e.Referrer),
		host, path, query, e.DomContentLoadedEventEnd, e.LoadEventEnd, e.ResponseEnd, e.FirstPaint, e.FirstContentfulPaint,
		e.SpeedIndex, e.VisuallyComplete, e.TimeToInteractive, calcResponseTime(e), calcDomBuildingTime(e)); err != nil {
		log.Printf("insert web page event in bulk err: %s", err)
	}
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sessionID, 1, 1)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sessionID, projectID, "LOCATION", url.DiscardURLQuery(path))
	conn.insertAutocompleteValue(sessionID, projectID, "REFERRER", url.DiscardURLQuery(e.Referrer))
	return nil
}

func (conn *Conn) InsertWebClickEvent(sessionID uint64, projectID uint32, e *ClickEvent) error {
	sqlRequest := `
		INSERT INTO events.clicks
			(session_id, message_id, timestamp, label, selector, url)
		(SELECT
			$1, $2, $3, NULLIF($4, ''), $5, host || path
			FROM events.pages
			WHERE session_id = $1 AND timestamp <= $3 ORDER BY timestamp DESC LIMIT 1
		)
		`
	conn.batchQueue(sessionID, sqlRequest, sessionID, e.MessageID, e.Timestamp, e.Label, e.Selector)
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sessionID, 1, 0)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sessionID, projectID, "CLICK", e.Label)
	return nil
}

func (conn *Conn) InsertWebInputEvent(sessionID uint64, projectID uint32, e *InputEvent) error {
	if e.Label == "" {
		return nil
	}
	value := &e.Value
	if e.ValueMasked {
		value = nil
	}
	if err := conn.webInputEvents.Append(sessionID, e.MessageID, e.Timestamp, value, e.Label); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.updateSessionEvents(sessionID, 1, 0)
	conn.insertAutocompleteValue(sessionID, projectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebJSException(projectID uint32, m *JSException) error {
	messageID := m.Meta().Index
	if err := conn.insertWebErrorEvent(m.SessionID(), projectID, &ErrorEvent{ // TODO: get rid of ErrorEvent message
		MessageID: messageID,
		Timestamp: uint64(m.Meta().Timestamp),
		Source:    "js_exception",
		Name:      m.Name,
		Message:   m.Message,
		Payload:   m.Payload,
	}); err != nil {
		return err
	}
	return conn.insertWebErrorMetadata(m.SessionID(), messageID, m.Metadata)
}

func (conn *Conn) InsertWebIntegrationEvent(projectID uint32, m *IntegrationEvent) error {
	return conn.insertWebErrorEvent(m.SessionID(), projectID, &ErrorEvent{
		MessageID: m.Meta().Index, // This will be always 0 here since it's coming from backend TODO: find another way to index
		Timestamp: m.Timestamp,
		Source:    m.Source,
		Name:      m.Name,
		Message:   m.Message,
		Payload:   m.Payload,
	})
}

func unquote(s string) string {
	if s[0] == '"' {
		return s[1 : len(s)-1]
	}
	return s
}
func parseTags(tagsJSON string) (tags map[string]*string, err error) {
	if tagsJSON[0] == '[' {
		var tagsArr []json.RawMessage
		if err = json.Unmarshal([]byte(tagsJSON), &tagsArr); err != nil {
			return
		}

		tags = make(map[string]*string)
		for _, keyBts := range tagsArr {
			tags[unquote(string(keyBts))] = nil
		}
	} else if tagsJSON[0] == '{' {
		var tagsObj map[string]json.RawMessage
		if err = json.Unmarshal([]byte(tagsJSON), &tagsObj); err != nil {
			return
		}

		tags = make(map[string]*string)
		for key, valBts := range tagsObj {
			val := unquote(string(valBts))
			tags[key] = &val
		}
	}
	return
}

func (conn *Conn) insertWebErrorMetadata(sessionID uint64, messageID uint64, mdJSON string) error {
	tags, err := parseTags(mdJSON)
	if err != nil {
		return err
	}

	sqlRequest := `
		INSERT INTO public.errors_tags (
			session_id, message_id, key, value
		) VALUES (
			$1, $2, $3,
		) ON CONFLICT DO NOTHING`
	for key, value := range tags {
		conn.batchQueue(sessionID, sqlRequest, sessionID, messageID, key, value)
	}
	return nil
}

func (conn *Conn) insertWebErrorEvent(sessionID uint64, projectID uint32, e *ErrorEvent) (err error) {
	tx, err := conn.c.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			if rollbackErr := tx.rollback(); rollbackErr != nil {
				log.Printf("rollback err: %s", rollbackErr)
			}
		}
	}()
	errorID := hashid.ErrorID(projectID, e)

	if err = tx.exec(`
		INSERT INTO errors
			(error_id, project_id, source, name, message, payload)
		VALUES
			($1, $2, $3, $4, $5, $6::jsonb)
		ON CONFLICT DO NOTHING`,
		errorID, projectID, e.Source, e.Name, e.Message, e.Payload,
	); err != nil {
		return err
	}
	if err = tx.exec(`
		INSERT INTO events.errors
			(session_id, message_id, timestamp, error_id)
		VALUES
			($1, $2, $3, $4)
		`,
		sessionID, e.MessageID, e.Timestamp, errorID,
	); err != nil {
		return err
	}
	if err = tx.exec(`
		UPDATE sessions SET errors_count = errors_count + 1, issue_score = issue_score + 1000
		WHERE session_id = $1`,
		sessionID,
	); err != nil {
		return err
	}
	err = tx.commit()
	return
}

func (conn *Conn) InsertWebFetchEvent(sessionID uint64, projectID uint32, savePayload bool, e *FetchEvent) error {
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
	conn.batchQueue(sessionID, sqlRequest,
		sessionID, e.Timestamp, e.MessageID,
		e.URL, host, path, query,
		request, response, e.Status, url.EnsureMethod(e.Method),
		e.Duration, e.Status < 400,
	)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(e.URL)+len(host)+len(path)+len(query)+
		len(e.Request)+len(e.Response)+len(url.EnsureMethod(e.Method))+8*5+1)
	return nil
}

func (conn *Conn) InsertWebGraphQLEvent(sessionID uint64, projectID uint32, savePayload bool, e *GraphQLEvent) error {
	var request, response *string
	if savePayload {
		request = &e.Variables
		response = &e.Response
	}
	if err := conn.webGraphQLEvents.Append(sessionID, e.Timestamp, e.MessageID, e.OperationName, request, response); err != nil {
		log.Printf("insert web graphQL event err: %s", err)
	}
	conn.insertAutocompleteValue(sessionID, projectID, "GRAPHQL", e.OperationName)
	return nil
}

func (conn *Conn) InsertSessionReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	return conn.c.Exec(`
		UPDATE sessions 
		SET referrer = $1, base_referrer = $2
		WHERE session_id = $3 AND referrer IS NULL`,
		referrer, url.DiscardURLQuery(referrer), sessionID)
}
