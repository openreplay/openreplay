package main

import (
	. "openreplay/backend/pkg/messages"
)

func insertMessage(sessionID uint64, msg Message) error {
	switch m := msg.(type) {
	// Common
	case *Metadata:
		return pg.InsertMetadata(sessionID, m)
	case *IssueEvent:
		return pg.InsertIssueEvent(sessionID, m)
		//TODO: message adapter (transformer) (at the level of pkg/message) for types:
	// case *IOSMetadata, *IOSIssueEvent and others

	// Web
	case *SessionStart:
		return pg.InsertWebSessionStart(sessionID, m)
	case *SessionEnd:
		return pg.InsertWebSessionEnd(sessionID, m)
	case *UserID:
		return pg.InsertWebUserID(sessionID, m)
	case *UserAnonymousID:
		return pg.InsertWebUserAnonymousID(sessionID, m)
	case *CustomEvent:
		return pg.InsertWebCustomEvent(sessionID, m)
	case *ClickEvent:
		return pg.InsertWebClickEvent(sessionID, m)
	case *InputEvent:
		return pg.InsertWebInputEvent(sessionID, m)
		// Unique Web messages
	// case *ResourceEvent:
	// 	return pg.InsertWebResourceEvent(sessionID, m)
	case *PageEvent:
		return pg.InsertWebPageEvent(sessionID, m)
	case *ErrorEvent:
		return pg.InsertWebErrorEvent(sessionID, m)
	case *FetchEvent:
		return pg.InsertWebFetchEvent(sessionID, m)
	case *GraphQLEvent:
		return pg.InsertWebGraphQLEvent(sessionID, m)

		// IOS
	case *IOSSessionStart:
		return pg.InsertIOSSessionStart(sessionID, m)
	case *IOSSessionEnd:
		return pg.InsertIOSSessionEnd(sessionID, m)
	case *IOSUserID:
		return pg.InsertIOSUserID(sessionID, m)
	case *IOSUserAnonymousID:
		return pg.InsertIOSUserAnonymousID(sessionID, m)
	case *IOSCustomEvent:
		return pg.InsertIOSCustomEvent(sessionID, m)
	case *IOSClickEvent:
		return pg.InsertIOSClickEvent(sessionID, m)
	case *IOSInputEvent:
		return pg.InsertIOSInputEvent(sessionID, m)
		// Unique IOS messages
	case *IOSNetworkCall:
		return pg.InsertIOSNetworkCall(sessionID, m)
	case *IOSScreenEnter:
		return pg.InsertIOSScreenEnter(sessionID, m)
	case *IOSCrash:
		return pg.InsertIOSCrash(sessionID, m)
	}
	return nil // "Not implemented"
}
