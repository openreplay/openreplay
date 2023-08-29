package postgres

import (
	"log"
	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertIOSSessionStart(sessionID uint64, e *messages.IOSSessionStart) error {
	log.Printf("handle ios session %d start: %v", sessionID, e)
	return nil
}

func (conn *Conn) InsertIOSSessionEnd(sessionID uint64, e *messages.IOSSessionEnd) error {
	log.Printf("handle ios session %d end: %v", sessionID, e)
	return nil
}

func (conn *Conn) InsertIOSCustomEvent(session *sessions.Session, e *messages.IOSCustomEvent) error {
	if err := conn.InsertCustomEvent(session.SessionID, e.Timestamp, truncSqIdx(e.Index), e.Name, e.Payload); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(session.SessionID, session.ProjectID, "CUSTOM_IOS", e.Name)
	return nil
}

func (conn *Conn) InsertIOSNetworkCall(sessionID uint64, e *messages.IOSNetworkCall) error {
	err := conn.InsertRequest(sessionID, e.Timestamp, truncSqIdx(e.Index), e.URL, e.Duration, e.Success)
	if err == nil {
		conn.InsertAutocompleteValue(sessionID, 0, "REQUEST_IOS", url.DiscardURLQuery(e.URL))
	}
	return err
}

func (conn *Conn) InsertIOSScreenEnter(sessionID uint64, screenEnter *messages.IOSScreenEnter) error {
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.views (
			session_id, timestamp, seq_index, name
		) VALUES (
			$1, $2, $3, $4
		)`,
		sessionID, screenEnter.Timestamp, screenEnter.Index, screenEnter.ViewName,
	); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(sessionID, 0, "VIEW_IOS", screenEnter.ViewName)
	return nil
}

func (conn *Conn) InsertIOSClickEvent(sessionID uint64, clickEvent *messages.IOSClickEvent) error {
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.taps (
			session_id, timestamp, seq_index, label
		) VALUES (
			$1, $2, $3, $4
		)`,
		sessionID, clickEvent.Timestamp, clickEvent.Index, clickEvent.Label,
	); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(sessionID, 0, "CLICK_IOS", clickEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSSwipeEvent(sessionID uint64, swipeEvent *messages.IOSSwipeEvent) error {
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.swipes (
			session_id, timestamp, seq_index, label, direction
		) VALUES (
			$1, $2, $3, $4, $5
		)`,
		sessionID, swipeEvent.Timestamp, swipeEvent.Index, swipeEvent.Label, swipeEvent.Direction,
	); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(sessionID, 0, "SWIPE_IOS", swipeEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSInputEvent(sessionID uint64, inputEvent *messages.IOSInputEvent) error {
	var value interface{} = inputEvent.Value
	if inputEvent.ValueMasked {
		value = nil
	}
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.inputs (
			session_id, timestamp, seq_index, label, value
		) VALUES (
			$1, $2, $3, $4, $5
		)`,
		sessionID, inputEvent.Timestamp, inputEvent.Index, inputEvent.Label, value,
	); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(sessionID, 0, "INPUT_IOS", inputEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSCrash(sessionID uint64, projectID uint32, crash *messages.IOSCrash) error {
	crashID := hashid.IOSCrashID(projectID, crash)

	if err := conn.Pool.Exec(`
		INSERT INTO crashes_ios (
			project_id, crash_id, name, reason, stacktrace
		) VALUES (
			$1, $2, $3, $4, $5
		) ON CONFLICT DO NOTHING`,
		projectID, crashID, crash.Name, crash.Reason, crash.Stacktrace,
	); err != nil {
		return err
	}
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.crashes (
			session_id, timestamp, seq_index, crash_id
		) VALUES (
			$1, $2, $3, $4
		)`,
		sessionID, crash.Timestamp, crash.Index, crashID,
	); err != nil {
		return err
	}
	return nil
}
