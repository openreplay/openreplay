package datasaver

import (
	. "openreplay/backend/pkg/messages"
)

func (mi *Saver) InsertMessage(msg Message) error {

	switch m := msg.(type) {
	// Common
	case *Metadata:
		return mi.pg.InsertMetadata(m)
	case *IssueEvent:
		return mi.pg.InsertIssueEvent(m)

	// Web
	case *SessionStart:
		return mi.pg.HandleWebSessionStart(m)
	case *SessionEnd:
		return mi.pg.HandleWebSessionEnd(m)
	case *UserID:
		return mi.pg.InsertWebUserID(m)
	case *UserAnonymousID:
		return mi.pg.InsertWebUserAnonymousID(m)
	case *CustomEvent:
		err := mi.pg.InsertWebCustomEvent(m)
		if err != nil {
			return err
		}
		return mi.pg.InsertIssueEvent(&IssueEvent{
			Type:          "custom",
			Timestamp:     m.Time(),
			MessageID:     m.MsgID(),
			ContextString: m.Name,
			Payload:       m.Payload,
		})
	case *MouseClick:
		return mi.pg.InsertWebClickEvent(m)
	case *InputEvent:
		return mi.pg.InsertWebInputEvent(m)

	// Unique Web messages
	case *PageEvent:
		return mi.pg.InsertWebPageEvent(m)
	case *NetworkRequest:
		return mi.pg.InsertWebNetworkRequest(m)
	case *GraphQL:
		return mi.pg.InsertWebGraphQL(m)
	case *JSException:
		return mi.pg.InsertWebJSException(m)
	case *IntegrationEvent:
		return mi.pg.InsertWebIntegrationEvent(m)

		// IOS
	case *IOSSessionStart:
		return mi.pg.InsertIOSSessionStart(m)
	case *IOSSessionEnd:
		return mi.pg.InsertIOSSessionEnd(m)
	case *IOSUserID:
		return mi.pg.InsertIOSUserID(m)
	case *IOSUserAnonymousID:
		return mi.pg.InsertIOSUserAnonymousID(m)
	case *IOSCustomEvent:
		return mi.pg.InsertIOSCustomEvent(m)
	case *IOSClickEvent:
		return mi.pg.InsertIOSClickEvent(m)
	case *IOSInputEvent:
		return mi.pg.InsertIOSInputEvent(m)
		// Unique IOS messages
	case *IOSNetworkCall:
		return mi.pg.InsertIOSNetworkCall(m)
	case *IOSScreenEnter:
		return mi.pg.InsertIOSScreenEnter(m)
	case *IOSCrash:
		return mi.pg.InsertIOSCrash(m)

	}
	return nil // "Not implemented"
}
