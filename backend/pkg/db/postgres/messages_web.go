package postgres

import (
	"math"

	"openreplay/backend/pkg/hashid"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

// TODO: change messages and replace everywhere to e.Index
func getSqIdx(messageID uint64) uint {
	return uint(messageID % math.MaxInt32)
}


func (conn *Conn) InsertWebCustomEvent(sessionID uint64, e *CustomEvent) error {
	err := conn.InsertCustomEvent(sessionID, e.Timestamp, 
		e.MessageID,
		e.Name, e.Payload)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, "CUSTOM", e.Name)
	}
	return err
}

func (conn *Conn) InsertWebUserID(sessionID uint64, userID *UserID) error {
	err := conn.InsertUserID(sessionID, userID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, "USERID", userID.ID)
	}
	return err
}

func (conn *Conn) InsertWebUserAnonymousID(sessionID uint64, userAnonymousID *UserAnonymousID) error {
	err := conn.InsertUserAnonymousID(sessionID, userAnonymousID.ID)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, "USERANONYMOUSID", userAnonymousID.ID)
	}
	return err
}

func (conn *Conn) InsertWebResourceEvent(sessionID uint64, e *ResourceEvent) error {
	if e.Type != "fetch" {
		return nil
	}
	err := conn.InsertRequest(sessionID, e.Timestamp, 
		e.MessageID,
		e.URL, e.Duration, e.Success,
	)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, "REQUEST", url.DiscardURLQuery(e.URL))	
	}
	return err
}

// TODO: fix column "dom_content_loaded_event_end" of relation "pages"
func (conn *Conn) InsertWebPageEvent(sessionID uint64, e *PageEvent) error {
	host, path, err := url.GetURLParts(e.URL)
	if err != nil {
		return err
	}
	tx, err := conn.begin()
	if err != nil {
		return err  
	}
	defer tx.rollback()
	if err := tx.exec(`
		INSERT INTO events.pages (
			session_id, message_id, timestamp, referrer, base_referrer, host, path, base_path,
			dom_content_loaded_time, load_time, response_end, first_paint_time, first_contentful_paint_time, 
			speed_index, visually_complete, time_to_interactive,
			response_time, dom_building_time
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			NULLIF($9, 0), NULLIF($10, 0), NULLIF($11, 0), NULLIF($12, 0), NULLIF($13, 0), 
			NULLIF($14, 0), NULLIF($15, 0), NULLIF($16, 0),
			NULLIF($17, 0), NULLIF($18, 0)
		)
		`,
		sessionID, e.MessageID, e.Timestamp, e.Referrer, url.DiscardURLQuery(e.Referrer), host, path, url.DiscardURLQuery(path),
		e.DomContentLoadedEventEnd, e.LoadEventEnd, e.ResponseEnd, e.FirstPaint, e.FirstContentfulPaint, 
		e.SpeedIndex, e.VisuallyComplete, e.TimeToInteractive,
		calcResponseTime(e), calcDomBuildingTime(e),
	); err != nil {
		return err
	}
	if err = tx.exec(`
		UPDATE sessions SET (pages_count, events_count) = (pages_count + 1, events_count + 1)
		WHERE session_id = $1`,
		sessionID,
	); err != nil {
		return err
	}
	if err = tx.commit(); err != nil {
		return err
	}
	conn.insertAutocompleteValue(sessionID, "LOCATION", url.DiscardURLQuery(path))
	conn.insertAutocompleteValue(sessionID, "REFERRER", url.DiscardURLQuery(e.Referrer))
	return nil
}

func (conn *Conn) InsertWebClickEvent(sessionID uint64, e *ClickEvent) error {
	tx, err := conn.begin()
	if err != nil {
		return err
	}
	defer tx.rollback()
	if err = tx.exec(`
		INSERT INTO events.clicks
			(session_id, message_id, timestamp, label, selector, url)
		(SELECT
			$1, $2, $3, NULLIF($4, ''), $5, host || base_path
			FROM events.pages
			WHERE session_id = $1 AND timestamp <= $3 ORDER BY timestamp DESC LIMIT 1
		)
		`,
		sessionID, e.MessageID, e.Timestamp, e.Label, e.Selector,
	); err != nil {
		return err
	}
	if err = tx.exec(`
		UPDATE sessions SET events_count = events_count + 1
		WHERE session_id = $1`,
		sessionID,
	); err != nil {
		return err
	}
	if err = tx.commit(); err != nil {
		return err
	}
	conn.insertAutocompleteValue(sessionID, "CLICK", e.Label)
	return nil
}


func (conn *Conn) InsertWebInputEvent(sessionID uint64, e *InputEvent) error {
	tx, err := conn.begin()
	if err != nil {
		return err
	}
	defer tx.rollback()
	value := &e.Value
	if e.ValueMasked {
		value = nil
	}
	if err = tx.exec(`
		INSERT INTO events.inputs
			(session_id, message_id, timestamp, value, label)
		VALUES
			($1, $2, $3, $4, NULLIF($5,''))
		`,
		sessionID, e.MessageID, e.Timestamp, value, e.Label,
	); err != nil {
		return err
	}
	if err = tx.exec(`
		UPDATE sessions SET events_count = events_count + 1
		WHERE session_id = $1`,
		sessionID,
	); err != nil {
		return err
	}
	if err = tx.commit(); err != nil {
		return err
	}
	conn.insertAutocompleteValue(sessionID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebErrorEvent(sessionID uint64, projectID uint32, e *ErrorEvent) error {
	tx, err := conn.begin()
	if err != nil {
		return err
	}
	defer tx.rollback()
	errorID := hashid.WebErrorID(projectID, e)

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
	return tx.commit()
}
