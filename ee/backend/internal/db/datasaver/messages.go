package datasaver

import (
	"fmt"
	"log"
	. "openreplay/backend/pkg/messages"
)

func (mi *Saver) InsertMessage(msg Message) error {
	sessionID := msg.SessionID()
	switch m := msg.(type) {
	// Common
	case *Metadata:
		if err := mi.pg.InsertMetadata(sessionID, m); err != nil {
			return fmt.Errorf("insert metadata err: %s", err)
		}
		return nil
	case *IssueEvent:
		session, err := mi.pg.Cache.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			if err := mi.ch.InsertIssue(session, m); err != nil {
				log.Printf("can't insert issue event into clickhouse: %s", err)
			}
		}
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
		session, err := mi.pg.Cache.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			if err := mi.ch.InsertCustom(session, m); err != nil {
				log.Printf("can't insert graphQL event into clickhouse: %s", err)
			}
		}
		return mi.pg.InsertWebCustomEvent(sessionID, m)
	case *ClickEvent:
		return mi.pg.InsertWebClickEvent(sessionID, m)
	case *InputEvent:
		return mi.pg.InsertWebInputEvent(sessionID, m)

	// Unique Web messages
	case *PageEvent:
		return mi.pg.InsertWebPageEvent(sessionID, m)
	case *JSException:
		return mi.pg.InsertWebJSException(m)
	case *IntegrationEvent:
		return mi.pg.InsertWebIntegrationEvent(m)
	case *NetworkRequest:
		session, err := mi.pg.Cache.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			project, err := mi.pg.GetProject(session.ProjectID)
			if err != nil {
				log.Printf("can't get project: %s", err)
			} else {
				if err := mi.ch.InsertRequest(session, m, project.SaveRequestPayloads); err != nil {
					log.Printf("can't insert request event into clickhouse: %s", err)
				}
			}
		}
		return mi.pg.InsertWebNetworkRequest(sessionID, m)
	case *GraphQL:
		session, err := mi.pg.Cache.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			if err := mi.ch.InsertGraphQL(session, m); err != nil {
				log.Printf("can't insert graphQL event into clickhouse: %s", err)
			}
		}
		return mi.pg.InsertWebGraphQL(sessionID, m)
	case *SetPageLocation:
		return mi.pg.InsertSessionReferrer(sessionID, m.Referrer)

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
