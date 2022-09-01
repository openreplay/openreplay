package datasaver

import (
	"fmt"
	"log"
	"openreplay/backend/pkg/messages"
)

func (mi *Saver) InsertMessage(sessionID uint64, msg messages.Message) error {
	switch m := msg.(type) {
	// Common
	case *messages.Metadata:
		if err := mi.pg.InsertMetadata(sessionID, m); err != nil {
			return fmt.Errorf("insert metadata err: %s", err)
		}
		return nil
	case *messages.IssueEvent:
		return mi.pg.InsertIssueEvent(sessionID, m)
	//TODO: message adapter (transformer) (at the level of pkg/message) for types: *IOSMetadata, *IOSIssueEvent and others

	// Web
	case *messages.SessionStart:
		return mi.pg.HandleWebSessionStart(sessionID, m)
	case *messages.SessionEnd:
		return mi.pg.HandleWebSessionEnd(sessionID, m)
	case *messages.UserID:
		return mi.pg.InsertWebUserID(sessionID, m)
	case *messages.UserAnonymousID:
		return mi.pg.InsertWebUserAnonymousID(sessionID, m)
	case *messages.CustomEvent:
		session, err := mi.pg.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			if err := mi.ch.InsertCustom(session, m); err != nil {
				log.Printf("can't insert graphQL event into clickhouse: %s", err)
			}
		}
		return mi.pg.InsertWebCustomEvent(sessionID, m)
	case *messages.ClickEvent:
		return mi.pg.InsertWebClickEvent(sessionID, m)
	case *messages.InputEvent:
		return mi.pg.InsertWebInputEvent(sessionID, m)

	// Unique Web messages
	case *messages.PageEvent:
		return mi.pg.InsertWebPageEvent(sessionID, m)
	case *messages.ErrorEvent:
		return mi.pg.InsertWebErrorEvent(sessionID, m)
	case *messages.FetchEvent:
		session, err := mi.pg.GetSession(sessionID)
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
		return mi.pg.InsertWebFetchEvent(sessionID, m)
	case *messages.GraphQLEvent:
		session, err := mi.pg.GetSession(sessionID)
		if err != nil {
			log.Printf("can't get session info for CH: %s", err)
		} else {
			if err := mi.ch.InsertGraphQL(session, m); err != nil {
				log.Printf("can't insert graphQL event into clickhouse: %s", err)
			}
		}
		return mi.pg.InsertWebGraphQLEvent(sessionID, m)
	case *messages.IntegrationEvent:
		return mi.pg.InsertWebErrorEvent(sessionID, &messages.ErrorEvent{
			MessageID: m.Meta().Index,
			Timestamp: m.Timestamp,
			Source:    m.Source,
			Name:      m.Name,
			Message:   m.Message,
			Payload:   m.Payload,
		})
	case *messages.SetPageLocation:
		return mi.pg.InsertSessionReferrer(sessionID, m.Referrer)

		// IOS
	case *messages.IOSSessionStart:
		return mi.pg.InsertIOSSessionStart(sessionID, m)
	case *messages.IOSSessionEnd:
		return mi.pg.InsertIOSSessionEnd(sessionID, m)
	case *messages.IOSUserID:
		return mi.pg.InsertIOSUserID(sessionID, m)
	case *messages.IOSUserAnonymousID:
		return mi.pg.InsertIOSUserAnonymousID(sessionID, m)
	case *messages.IOSCustomEvent:
		return mi.pg.InsertIOSCustomEvent(sessionID, m)
	case *messages.IOSClickEvent:
		return mi.pg.InsertIOSClickEvent(sessionID, m)
	case *messages.IOSInputEvent:
		return mi.pg.InsertIOSInputEvent(sessionID, m)
		// Unique IOS messages
	case *messages.IOSNetworkCall:
		return mi.pg.InsertIOSNetworkCall(sessionID, m)
	case *messages.IOSScreenEnter:
		return mi.pg.InsertIOSScreenEnter(sessionID, m)
	case *messages.IOSCrash:
		return mi.pg.InsertIOSCrash(sessionID, m)

	}
	return nil // "Not implemented"
}
