package datasaver

import (
	"fmt"
	"log"
)

func (mi *Saver) InsertMessage(msg Message) error {
	sessionID := msg.SessionID()
	switch m := msg.(type) {
	// Common
	case *Metadata:
		if err := mi.pg.InsertMetadata(m); err != nil {
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
		session, err := mi.pg.Cache.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			if err := mi.ch.InsertCustom(session, m); err != nil {
				log.Printf("can't insert graphQL event into clickhouse: %s", err)
			}
		}
		return mi.pg.InsertWebCustomEvent(m)
	case *MouseClick:
		return mi.pg.InsertWebClickEvent(m)
	case *InputEvent:
		return mi.pg.InsertWebInputEvent(m)

	// Unique Web messages
	case *PageEvent:
		return mi.pg.InsertWebPageEvent(m)
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
		return mi.pg.InsertWebNetworkRequest(m)
	case *GraphQL:
		session, err := mi.pg.Cache.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			if err := mi.ch.InsertGraphQL(session, m); err != nil {
				log.Printf("can't insert graphQL event into clickhouse: %s", err)
			}
		}
		return mi.pg.InsertWebGraphQL(m)
	case *SetPageLocation:
		return mi.pg.InsertSessionReferrer(m.Referrer)

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
