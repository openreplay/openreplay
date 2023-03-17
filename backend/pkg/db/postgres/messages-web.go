package postgres

import (
	"log"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/hashid"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/url"
)

func (conn *Conn) InsertWebCustomEvent(sessionID uint64, projectID uint32, e *CustomEvent) error {
	err := conn.InsertCustomEvent(
		sessionID,
		uint64(e.Meta().Timestamp),
		truncSqIdx(e.Meta().Index),
		e.Name,
		e.Payload,
	)
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
	if err = conn.bulks.Get("webPageEvents").Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, e.Referrer, url.DiscardURLQuery(e.Referrer),
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

func (conn *Conn) InsertWebClickEvent(sessionID uint64, projectID uint32, e *MouseClick) error {
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

func (conn *Conn) InsertWebInputEvent(sessionID uint64, projectID uint32, e *InputEvent) error {
	if e.Label == "" {
		return nil
	}
	value := &e.Value
	if e.ValueMasked {
		value = nil
	}
	if err := conn.bulks.Get("webInputEvents").Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, value, e.Label); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.updateSessionEvents(sessionID, 1, 0)
	conn.insertAutocompleteValue(sessionID, projectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebInputDuration(sessionID uint64, projectID uint32, e *InputChange) error {
	// Debug log
	log.Printf("new InputDuration event: %v", e)
	if e.Label == "" {
		return nil
	}
	value := &e.Value
	if e.ValueMasked {
		value = nil
	}
	if err := conn.bulks.Get("webInputDurations").Append(sessionID, truncSqIdx(e.ID), e.Timestamp, value, e.Label, e.HesitationTime, e.InputDuration); err != nil {
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

func (conn *Conn) InsertWebNetworkRequest(sessionID uint64, projectID uint32, savePayload bool, e *NetworkRequest) error {
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

func (conn *Conn) InsertWebGraphQL(sessionID uint64, projectID uint32, savePayload bool, e *GraphQL) error {
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

func (conn *Conn) InsertSessionReferrer(sessionID uint64, referrer string) error {
	if referrer == "" {
		return nil
	}
	return conn.c.Exec(`
		UPDATE sessions 
		SET referrer = LEFT($1, 8000), base_referrer = LEFT($2, 8000)
		WHERE session_id = $3 AND referrer IS NULL`,
		referrer, url.DiscardURLQuery(referrer), sessionID)
}

func (conn *Conn) InsertMouseThrashing(sessionID uint64, projectID uint32, e *MouseThrashing) error {
	// Debug log
	log.Printf("new MouseThrashing event: %v", e)
	//
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
