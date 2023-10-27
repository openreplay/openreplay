package datasaver

import (
	"log"

	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/sessions"
)

func (s *saverImpl) init() {
	s.ch = clickhouse.NewConnector(env.String("CLICKHOUSE_STRING"))
	if err := s.ch.Prepare(); err != nil {
		log.Fatalf("can't prepare clickhouse: %s", err)
	}
	s.pg.SetClickHouse(s.ch)
	if s.cfg.UseQuickwit {
		s.producer = queue.NewProducer(s.cfg.MessageSizeLimit, true)
	}
}

func (s *saverImpl) handleExtraMessage(msg messages.Message) error {
	// Get session data
	var (
		session *sessions.Session
		err     error
	)

	if msg.TypeID() == messages.MsgSessionEnd {
		session, err = s.sessions.GetUpdated(msg.SessionID())
	} else {
		session, err = s.sessions.Get(msg.SessionID())
	}
	if err != nil || session == nil {
		log.Printf("Error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
		return err
	}

	// Send data to quickwit
	s.sendToFTS(msg, session.ProjectID)

	// Handle message
	switch m := msg.(type) {
	case *messages.SessionEnd:
		return s.ch.InsertWebSession(session)
	case *messages.PerformanceTrackAggr:
		return s.ch.InsertWebPerformanceTrackAggr(session, m)
	case *messages.MouseClick:
		return s.ch.InsertWebClickEvent(session, m)
	// Unique for Web
	case *messages.PageEvent:
		return s.ch.InsertWebPageEvent(session, m)
	case *messages.ResourceTiming:
		return s.ch.InsertWebResourceEvent(session, m)
	case *messages.JSException:
		return s.ch.InsertWebErrorEvent(session, types.WrapJSException(m))
	case *messages.IntegrationEvent:
		return s.ch.InsertWebErrorEvent(session, types.WrapIntegrationEvent(m))
	case *messages.IssueEvent:
		return s.ch.InsertIssue(session, m)
	case *messages.CustomEvent:
		return s.ch.InsertCustom(session, m)
	case *messages.NetworkRequest:
		if err := s.ch.InsertRequest(session, m, session.SaveRequestPayload); err != nil {
			log.Printf("can't insert request event into clickhouse: %s", err)
		}
	case *messages.GraphQL:
		return s.ch.InsertGraphQL(session, m)
	case *messages.InputChange:
		return s.ch.InsertWebInputDuration(session, m)
	case *messages.MouseThrashing:
		return s.ch.InsertMouseThrashing(session, m)

	// Mobile messages
	case *messages.IOSSessionEnd:
		return s.ch.InsertMobileSession(session)
	case *messages.IOSEvent:
		return s.ch.InsertMobileCustom(session, m)
	case *messages.IOSClickEvent:
		return s.ch.InsertMobileClick(session, m)
	case *messages.IOSSwipeEvent:
		return s.ch.InsertMobileSwipe(session, m)
	case *messages.IOSInputEvent:
		return s.ch.InsertMobileInput(session, m)
	case *messages.IOSNetworkCall:
		return s.ch.InsertMobileRequest(session, m, session.SaveRequestPayload)
	case *messages.IOSCrash:
		return s.ch.InsertMobileCrash(session, m)
	}
	return nil
}
