package datasaver

import (
	"fmt"
	. "openreplay/backend/pkg/messages"
)

func (mi *Saver) InsertMessage(msg Message) error {
	sessionID := msg.SessionID()
	switch m := msg.(type) {
	// Common
	case *Metadata:
		if err := mi.sessions.InsertMetadata(sessionID, m); err != nil {
			return fmt.Errorf("insert metadata err: %s", err)
		}
		return nil
	case *IssueEvent:
		return mi.events.InsertIssueEvent(sessionID, m)

	// Web
	case *SessionStart:
		return mi.sessions.HandleSessionStart(sessionID, m)
	case *SessionEnd:
		return mi.sessions.HandleSessionEnd(sessionID, m)
	case *UserID:
		return mi.sessions.InsertUserID(sessionID, m)
	case *UserAnonymousID:
		return mi.sessions.InsertAnonymousUserID(sessionID, m)
	case *CustomEvent:
		return mi.events.InsertCustomEvent(sessionID, m)
	case *ClickEvent:
		return mi.events.InsertClickEvent(sessionID, m)
	case *InputEvent:
		return mi.events.InsertInputEvent(sessionID, m)

	// Unique Web messages
	case *PageEvent:
		mi.sendToFTS(msg, sessionID)
		return mi.events.InsertPageEvent(sessionID, m)
	case *ErrorEvent:
		return mi.events.InsertErrorEvent(sessionID, m)
	case *FetchEvent:
		mi.sendToFTS(msg, sessionID)
		return mi.events.InsertFetchEvent(sessionID, m)
	case *GraphQLEvent:
		mi.sendToFTS(msg, sessionID)
		return mi.events.InsertGraphQLEvent(sessionID, m)
	case *IntegrationEvent:
		return mi.events.InsertErrorEvent(sessionID, &ErrorEvent{
			MessageID: m.Meta().Index,
			Timestamp: m.Timestamp,
			Source:    m.Source,
			Name:      m.Name,
			Message:   m.Message,
			Payload:   m.Payload,
		})
	}
	return nil // "Not implemented"
}
