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

func (conn *Conn) InsertIOSEvent(session *sessions.Session, e *messages.IOSEvent) error {
	if err := conn.InsertCustomEvent(session.SessionID, e.Timestamp, truncSqIdx(e.Index), e.Name, e.Payload); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(session.SessionID, session.ProjectID, "CUSTOM_IOS", e.Name)
	return nil
}

func (conn *Conn) InsertIOSNetworkCall(sess *sessions.Session, e *messages.IOSNetworkCall) error {
	err := conn.InsertRequest(sess.SessionID, e.Timestamp, truncSqIdx(e.Index), e.URL, e.Duration, e.Status < 400)
	if err == nil {
		conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "REQUEST_IOS", url.DiscardURLQuery(e.URL))
	}
	return err
}

func (conn *Conn) InsertIOSClickEvent(sess *sessions.Session, clickEvent *messages.IOSClickEvent) error {
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.taps (
			session_id, timestamp, seq_index, label
		) VALUES (
			$1, $2, $3, $4
		)`,
		sess.SessionID, clickEvent.Timestamp, clickEvent.Index, clickEvent.Label,
	); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "CLICK_IOS", clickEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSSwipeEvent(sess *sessions.Session, swipeEvent *messages.IOSSwipeEvent) error {
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.swipes (
			session_id, timestamp, seq_index, label, direction
		) VALUES (
			$1, $2, $3, $4, $5
		)`,
		sess.SessionID, swipeEvent.Timestamp, swipeEvent.Index, swipeEvent.Label, swipeEvent.Direction,
	); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "SWIPE_IOS", swipeEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSInputEvent(sess *sessions.Session, inputEvent *messages.IOSInputEvent) error {
	if err := conn.Pool.Exec(`
		INSERT INTO events_ios.inputs (
			session_id, timestamp, seq_index, label
		) VALUES (
			$1, $2, $3, $4
		)`,
		sess.SessionID, inputEvent.Timestamp, inputEvent.Index, inputEvent.Label,
	); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "INPUT_IOS", inputEvent.Label)
	return nil
}

func (conn *Conn) InsertIOSCrash(sessionID uint64, projectID uint32, crash *messages.IOSCrash) error {
	crashID := hashid.IOSCrashID(projectID, crash)

	if err := conn.Pool.Exec(`
		INSERT INTO public.crashes_ios (
			project_id, crash_ios_id, name, reason, stacktrace
		) VALUES (
			$1, $2, $3, $4, $5
		) ON CONFLICT DO NOTHING`,
		projectID, crashID, crash.Name, crash.Reason, crash.Stacktrace,
	); err != nil {
		return err
	}
	if err := conn.Pool.Exec(`
		INSERT INTO events_common.crashes (
			session_id, timestamp, seq_index, crash_ios_id
		) VALUES (
			$1, $2, $3, $4
		)`,
		sessionID, crash.Timestamp, crash.Index, crashID,
	); err != nil {
		return err
	}
	return nil
}

func (conn *Conn) InsertIOSIssueEvent(sess *sessions.Session, e *messages.IOSIssueEvent) error {
	issueID := hashid.IOSIssueID(sess.ProjectID, e)
	payload := &e.Payload
	if *payload == "" || *payload == "{}" {
		payload = nil
	}

	if err := conn.bulks.Get("webIssues").Append(sess.ProjectID, issueID, e.Type, e.ContextString); err != nil {
		log.Printf("insert web issue err: %s", err)
	}
	if err := conn.bulks.Get("webIssueEvents").Append(sess.SessionID, issueID, e.Timestamp, truncSqIdx(e.Index), payload); err != nil {
		log.Printf("insert web issue event err: %s", err)
	}
	return nil
}

type IOSCrash struct {
	Timestamp  uint64 `json:"timestamp"`
	Name       string `json:"name"`
	Reason     string `json:"reason"`
	Stacktrace string `json:"stacktrace"`
}

type WebCrash struct {
	Timestamp uint64 `json:"timestamp"`
}
