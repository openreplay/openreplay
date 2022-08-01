package datasaver

import (
	"fmt"
	. "openreplay/backend/pkg/messages"
)

func (mi *Saver) InsertMessage(sessionID uint64, msg Message) error {
	switch m := msg.(type) {
	// Common
	case *Metadata:
		if err := mi.pg.InsertMetadata(sessionID, m); err != nil {
			return fmt.Errorf("insert metadata err: %s", err)
		}
		return nil
	case *IssueEvent:
		return mi.pg.InsertIssueEvent(sessionID, m)
	//TODO: message adapter (transformer) (at the level of pkg/message) for types: *IOSMetadata, *IOSIssueEvent and others

	// Web
	case *SessionStart:
		return mi.pg.HandleWebSessionStart(sessionID, m)
	case *SessionEnd:
		return mi.pg.HandleWebSessionEnd(sessionID, m)
	case *UserID:
		return mi.pg.InsertWebUserID(sessionID, m)
	case *UserAnonymousID:
		return mi.pg.InsertWebUserAnonymousID(sessionID, m)
	case *CustomEvent:
		return mi.pg.InsertWebCustomEvent(sessionID, m)
	case *ClickEvent:
		return mi.pg.InsertWebClickEvent(sessionID, m)
	case *InputEvent:
		return mi.pg.InsertWebInputEvent(sessionID, m)

	// Unique Web messages
	case *PageEvent:
		mi.sendToFTS(msg, sessionID)
		return mi.pg.InsertWebPageEvent(sessionID, m)
	case *ErrorEvent:
		return mi.pg.InsertWebErrorEvent(sessionID, m)
	case *FetchEvent:
		mi.sendToFTS(msg, sessionID)
		return mi.pg.InsertWebFetchEvent(sessionID, m)
	case *GraphQLEvent:
		mi.sendToFTS(msg, sessionID)
		return mi.pg.InsertWebGraphQLEvent(sessionID, m)
	case *IntegrationEvent:
		return mi.pg.InsertWebErrorEvent(sessionID, &ErrorEvent{
			MessageID: m.Meta().Index,
			Timestamp: m.Timestamp,
			Source:    m.Source,
			Name:      m.Name,
			Message:   m.Message,
			Payload:   m.Payload,
		})

		// IOS
	case *IOSSessionStart:
		return mi.pg.InsertIOSSessionStart(sessionID, m)
	case *IOSSessionEnd:
		return mi.pg.InsertIOSSessionEnd(sessionID, m)
	case *IOSUserID:
		return mi.pg.InsertIOSUserID(sessionID, m)
	case *IOSUserAnonymousID:
		return mi.pg.InsertIOSUserAnonymousID(sessionID, m)
	case *IOSCustomEvent:
		return mi.pg.InsertIOSCustomEvent(sessionID, m)
	case *IOSClickEvent:
		return mi.pg.InsertIOSClickEvent(sessionID, m)
	case *IOSInputEvent:
		return mi.pg.InsertIOSInputEvent(sessionID, m)
		// Unique IOS messages
	case *IOSNetworkCall:
		return mi.pg.InsertIOSNetworkCall(sessionID, m)
	case *IOSScreenEnter:
		return mi.pg.InsertIOSScreenEnter(sessionID, m)
	case *IOSCrash:
		return mi.pg.InsertIOSCrash(sessionID, m)

	}
	return nil // "Not implemented"
}
