package postgres

import (
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertIOSCustomEvent(e *messages.IOSCustomEvent) error {
	sessionID := e.SessionID()
	err := conn.InsertCustomEvent(sessionID, e.Timestamp, truncSqIdx(e.Index), e.Name, e.Payload, e.TabID())
	if err == nil {
		conn.insertAutocompleteValue(sessionID, 0, "CUSTOM_IOS", e.Name)
	}
	return err
}

func (conn *Conn) InsertIOSUserID(userID *messages.IOSUserID) error {
	sessionID := userID.SessionID()
	err := conn.InsertUserID(sessionID, userID.Value)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, 0, "USERID_IOS", userID.Value)
	}
	return err
}

func (conn *Conn) InsertIOSUserAnonymousID(userAnonymousID *messages.IOSUserAnonymousID) error {
	sessionID := userAnonymousID.SessionID()
	err := conn.InsertUserAnonymousID(sessionID, userAnonymousID.Value)
	if err == nil {
		conn.insertAutocompleteValue(sessionID, 0, "USERANONYMOUSID_IOS", userAnonymousID.Value)
	}
	return err
}

func (conn *Conn) InsertIOSNetworkCall(e *messages.IOSNetworkCall) error {
	sessionID := e.SessionID()
	err := conn.InsertRequest(sessionID, e.Timestamp, truncSqIdx(e.Index), e.URL, e.Duration, e.Success, e.TabID())
	if err == nil {
		conn.insertAutocompleteValue(sessionID, 0, "REQUEST_IOS", url.DiscardURLQuery(e.URL))
	}
	return err
}

func (conn *Conn) InsertIOSScreenEnter(screenEnter *messages.IOSScreenEnter) error {
	sessionID := screenEnter.SessionID()
	tx, err := conn.c.Begin()
	if err != nil {
		return err
	}
	defer tx.rollback()

	if err = tx.exec(`
		INSERT INTO events_ios.views (
			session_id, timestamp, seq_index, name
		) VALUES (
			$1, $2, $3, $4
		)`,
		sessionID, screenEnter.Timestamp, screenEnter.Index, screenEnter.ViewName,
	); err != nil {
		return err
	}
	if err = tx.exec(`
		UPDATE sessions SET pages_count = pages_count + 1 
		WHERE session_id = $1`,
		sessionID,
	); err != nil {
		return err
	}
	if err = tx.commit(); err != nil {
		return err
	}
	conn.insertAutocompleteValue(sessionID, 0, "VIEW_IOS", screenEnter.ViewName)
	return nil
}

func (conn *Conn) InsertIOSClickEvent(clickEvent *messages.IOSClickEvent) error {
	sessionID := clickEvent.SessionID()
	tx, err := conn.c.Begin()
	if err != nil {
		return err
	}
	defer tx.rollback()

	if err = tx.exec(`
		INSERT INTO events_ios.clicks (
			session_id, timestamp, seq_index, label
		) VALUES (
			$1, $2, $3, $4
		)`,
		sessionID, clickEvent.Timestamp, clickEvent.Index, clickEvent.Label,
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
	conn.insertAutocompleteValue(sessionID, 0, "CLICK_IOS", clickEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSInputEvent(inputEvent *messages.IOSInputEvent) error {
	sessionID := inputEvent.SessionID()
	tx, err := conn.c.Begin()
	if err != nil {
		return err
	}
	defer tx.rollback()

	var value interface{} = inputEvent.Value
	if inputEvent.ValueMasked {
		value = nil
	}

	if err = tx.exec(`
		INSERT INTO events_ios.inputs (
			session_id, timestamp, seq_index, label, value
		) VALUES (
			$1, $2, $3, $4, $5
		)`,
		sessionID, inputEvent.Timestamp, inputEvent.Index, inputEvent.Label, value,
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
	conn.insertAutocompleteValue(sessionID, 0, "INPUT_IOS", inputEvent.Label)
	// conn.insertAutocompleteValue(sessionID, "INPUT_VALUE", inputEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSCrash(projectID uint32, crash *messages.IOSCrash) error {
	sessionID := crash.SessionID()
	tx, err := conn.c.Begin()
	if err != nil {
		return err
	}
	defer tx.rollback()

	crashID := hashid.IOSCrashID(projectID, crash)

	if err = tx.exec(`
		INSERT INTO crashes_ios (
			project_id, crash_id, name, reason, stacktrace
		) (SELECT
			project_id, $2, $3, $4, $5
			FROM sessions
			WHERE session_id = $1
		)ON CONFLICT DO NOTHING`,
		sessionID, crashID, crash.Name, crash.Reason, crash.Stacktrace,
	); err != nil {
		return err
	}
	if err = tx.exec(`
		INSERT INTO events_ios.crashes (
			session_id, timestamp, seq_index, crash_id
		) VALUES (
			$1, $2, $3, $4
		)`,
		sessionID, crash.Timestamp, crash.Index, crashID,
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
