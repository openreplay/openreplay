package postgres

import (
	"log"

	"openreplay/backend/pkg/db/types"
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
	if err = conn.webPageEvents.Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, e.Referrer, url.DiscardURLQuery(e.Referrer),
		host, path, query, e.DomContentLoadedEventEnd, e.LoadEventEnd, e.ResponseEnd, e.FirstPaint, e.FirstContentfulPaint,
		e.SpeedIndex, e.VisuallyComplete, e.TimeToInteractive, calcResponseTime(e), calcDomBuildingTime(e)); err != nil {
		log.Printf("insert web page event in bulk err: %s", err)
	}
	// TODO: delete debug log
	log.Printf("page event, host: %s, path: %s", host, path)
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sessionID, 1, 1)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sessionID, projectID, "LOCATION", url.DiscardURLQuery(path))
	conn.insertAutocompleteValue(sessionID, projectID, "REFERRER", url.DiscardURLQuery(e.Referrer))
	// Insert collected click events for the current session into the database (bulk)
	list, ok := conn.clicks[sessionID]
	if !ok {
		return nil
	}
	for _, click := range list {
		conn.insertWebClickEvent(sessionID, path, click)
	}
	delete(conn.clicks, sessionID)
	return nil
}

type Click struct {
	ProjectID uint32
	MessageID uint64
	Timestamp uint64
	Label     string
	Selector  string
}

func (conn *Conn) InsertWebClickEvent(sessionID uint64, projectID uint32, e *ClickEvent) error {
	if _, ok := conn.clicks[sessionID]; !ok {
		conn.clicks[sessionID] = make([]*Click, 0, 1)
	}
	conn.clicks[sessionID] = append(conn.clicks[sessionID], &Click{
		ProjectID: projectID,
		MessageID: e.MessageID,
		Timestamp: e.Timestamp,
		Label:     e.Label,
		Selector:  e.Selector,
	})
	// TODO: debug log
	log.Println("add new click event: ", e)
	log.Println("clicks for current session: ", len(conn.clicks[sessionID]))
	return nil
}

func (conn *Conn) insertWebClickEvent(sessionID uint64, url string, e *Click) {
	//TODO: debug log
	log.Println("insert web click event:", sessionID, url, e)
	if err := conn.webClickEvents.Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, e.Label, e.Selector, url); err != nil {
		log.Printf("insert web click err: %s", err)
	}
	// Accumulate session updates and exec inside batch with another sql commands
	conn.updateSessionEvents(sessionID, 1, 0)
	// Add new value set to autocomplete bulk
	conn.insertAutocompleteValue(sessionID, e.ProjectID, "CLICK", e.Label)
}

func (conn *Conn) InsertWebInputEvent(sessionID uint64, projectID uint32, e *InputEvent) error {
	if e.Label == "" {
		return nil
	}
	value := &e.Value
	if e.ValueMasked {
		value = nil
	}
	if err := conn.webInputEvents.Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, value, e.Label); err != nil {
		log.Printf("insert web input event err: %s", err)
	}
	conn.updateSessionEvents(sessionID, 1, 0)
	conn.insertAutocompleteValue(sessionID, projectID, "INPUT", e.Label)
	return nil
}

func (conn *Conn) InsertWebErrorEvent(sessionID uint64, projectID uint32, e *types.ErrorEvent) error {
	errorID := e.ID(projectID)
	if err := conn.webErrors.Append(errorID, projectID, e.Source, e.Name, e.Message, e.Payload); err != nil {
		log.Printf("insert web error err: %s", err)
	}
	if err := conn.webErrorEvents.Append(sessionID, truncSqIdx(e.MessageID), e.Timestamp, errorID); err != nil {
		log.Printf("insert web error event err: %s", err)
	}
	conn.updateSessionIssues(sessionID, 1, 1000)
	for key, value := range e.Tags {
		if err := conn.webErrorTags.Append(sessionID, truncSqIdx(e.MessageID), errorID, key, value); err != nil {
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
		sessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index),
		e.URL, host, path, query,
		request, response, e.Status, url.EnsureMethod(e.Method),
		e.Duration, e.Status < 400,
	)

	// Record approximate message size
	conn.updateBatchSize(sessionID, len(sqlRequest)+len(e.URL)+len(host)+len(path)+len(query)+
		len(e.Request)+len(e.Response)+len(url.EnsureMethod(e.Method))+8*5+1)
	return nil
}

func (conn *Conn) InsertWebGraphQL(sessionID uint64, projectID uint32, savePayload bool, e *GraphQL) error {
	var request, response *string
	if savePayload {
		request = &e.Variables
		response = &e.Response
	}
	if err := conn.webGraphQL.Append(sessionID, e.Meta().Timestamp, truncSqIdx(e.Meta().Index), e.OperationName, request, response); err != nil {
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
