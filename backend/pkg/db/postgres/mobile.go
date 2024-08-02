package postgres

import (
	"context"

	"openreplay/backend/pkg/hashid"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertMobileEvent(session *sessions.Session, e *messages.MobileEvent) error {
	if err := conn.InsertCustomEvent(session.SessionID, e.Timestamp, truncSqIdx(e.Index), e.Name, e.Payload); err != nil {
		return err
	}
	conn.InsertAutocompleteValue(session.SessionID, session.ProjectID, "CUSTOMMOBILE", e.Name)
	return nil
}

func (conn *Conn) InsertMobileNetworkCall(sess *sessions.Session, e *messages.MobileNetworkCall) error {
	err := conn.InsertRequest(sess.SessionID, e.Timestamp, truncSqIdx(e.Index), e.URL, e.Duration, e.Status < 400)
	if err == nil {
		conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "REQUESTMOBILE", url.DiscardURLQuery(e.URL))
	}
	return err
}

func (conn *Conn) InsertMobileClickEvent(sess *sessions.Session, clickEvent *messages.MobileClickEvent) error {
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
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "CLICKMOBILE", clickEvent.Label)
	return nil
}

func (conn *Conn) InsertMobileSwipeEvent(sess *sessions.Session, swipeEvent *messages.MobileSwipeEvent) error {
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
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "SWIPEMOBILE", swipeEvent.Label)
	return nil
}

func (conn *Conn) InsertMobileInputEvent(sess *sessions.Session, inputEvent *messages.MobileInputEvent) error {
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
	conn.InsertAutocompleteValue(sess.SessionID, sess.ProjectID, "INPUTMOBILE", inputEvent.Label)
	return nil
}

func (conn *Conn) InsertMobileCrash(sessionID uint64, projectID uint32, crash *messages.MobileCrash) error {
	crashID := hashid.MobileCrashID(projectID, crash)

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

func (conn *Conn) InsertMobileIssueEvent(sess *sessions.Session, e *messages.MobileIssueEvent) error {
	issueID := hashid.MobileIssueID(sess.ProjectID, e)
	payload := &e.Payload
	if *payload == "" || *payload == "{}" {
		payload = nil
	}

	ctx := context.WithValue(context.Background(), "sessionID", sess.SessionID)
	if err := conn.bulks.Get("webIssues").Append(sess.ProjectID, issueID, e.Type, e.ContextString); err != nil {
		conn.log.Error(ctx, "can't add web issue to PG, err: %s", err)
	}
	if err := conn.bulks.Get("webIssueEvents").Append(sess.SessionID, issueID, e.Timestamp, truncSqIdx(e.Index), payload); err != nil {
		conn.log.Error(ctx, "can't add web issue event to PG, err: %s", err)
	}
	return nil
}

type MobileCrash struct {
	Timestamp  uint64 `json:"timestamp"`
	Name       string `json:"name"`
	Reason     string `json:"reason"`
	Stacktrace string `json:"stacktrace"`
}

type WebCrash struct {
	Timestamp uint64 `json:"timestamp"`
}
