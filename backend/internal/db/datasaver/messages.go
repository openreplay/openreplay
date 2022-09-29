package datasaver

import (
	"fmt"
	. "openreplay/backend/pkg/messages"
)

func (mi *Saver) InsertMessage(msg Message) error {
	switch m := msg.(type) {
	// Common
	case *Metadata:
		if err := mi.sessions.InsertMetadata(m); err != nil {
			return fmt.Errorf("insert metadata err: %s", err)
		}
		return nil
	case *IssueEvent:
		return mi.events.InsertIssueEvent(m)

	// Web
	case *SessionStart:
		return mi.sessions.HandleSessionStart(m)
	case *SessionEnd:
		return mi.sessions.HandleSessionEnd(m)
	case *UserID:
		return mi.sessions.InsertUserID(m)
	case *UserAnonymousID:
		return mi.sessions.InsertAnonymousUserID(m)
	case *CustomEvent:
		return mi.events.InsertCustomEvent(m)
	case *ClickEvent:
		return mi.events.InsertClickEvent(m)
	case *InputEvent:
		return mi.events.InsertInputEvent(m)

	// Unique Web messages
	case *PageEvent:
		mi.sendToFTS(msg)
		return mi.events.InsertPageEvent(m)
	case *ErrorEvent:
		return mi.events.InsertErrorEvent(m)
	case *FetchEvent:
		mi.sendToFTS(msg)
		return mi.events.InsertFetchEvent(m)
	case *GraphQLEvent:
		mi.sendToFTS(msg)
		return mi.events.InsertGraphQLEvent(m)
	case *IntegrationEvent:
		return mi.events.InsertErrorEvent(&ErrorEvent{
			MessageID: m.Meta().Index,
			Timestamp: m.Timestamp,
			Source:    m.Source,
			Name:      m.Name,
			Message:   m.Message,
			Payload:   m.Payload,
		})
	}
	return nil
}
