package datasaver

import (
	"fmt"
	"log"

	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/env"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
)

func (s *saverImpl) init() {
	s.ch = clickhouse.NewConnector(env.String("CLICKHOUSE_STRING"))
	if err := s.ch.Prepare(); err != nil {
		log.Fatalf("can't prepare clickhouse: %s", err)
	}
	s.pg.Conn.SetClickHouse(s.ch)
	if s.cfg.UseQuickwit {
		s.producer = queue.NewProducer(s.cfg.MessageSizeLimit, true)
	}
}

func (s *saverImpl) handleExtraMessage(msg Message) error {
	// Send data to quickwit
	s.sendToFTS(msg)

	// Get session data
	session, err := s.pg.Cache.GetSession(msg.SessionID())
	if err != nil {
		return fmt.Errorf("can't get session info for CH: %s", err)
	}

	// Handle message
	switch m := msg.(type) {
	case *SessionEnd:
		return s.ch.InsertWebSession(session)
	case *PerformanceTrackAggr:
		return s.ch.InsertWebPerformanceTrackAggr(session, m)
	case *MouseClick:
		return s.ch.InsertWebClickEvent(session, m)
	case *InputEvent:
		return s.ch.InsertWebInputEvent(session, m)
	// Unique for Web
	case *PageEvent:
		return s.ch.InsertWebPageEvent(session, m)
	case *ResourceTiming:
		return s.ch.InsertWebResourceEvent(session, m)
	case *JSException:
		return s.ch.InsertWebErrorEvent(session, types.WrapJSException(m))
	case *IntegrationEvent:
		return s.ch.InsertWebErrorEvent(session, types.WrapIntegrationEvent(m))
	case *IssueEvent:
		return s.ch.InsertIssue(session, m)
	case *CustomEvent:
		return s.ch.InsertCustom(session, m)
	case *NetworkRequest:
		project, err := s.pg.GetProject(session.ProjectID)
		if err != nil {
			log.Printf("can't get project: %s", err)
		} else {
			if err := s.ch.InsertRequest(session, m, project.SaveRequestPayloads); err != nil {
				log.Printf("can't insert request event into clickhouse: %s", err)
			}
		}
	case *GraphQL:
		return s.ch.InsertGraphQL(session, m)
	}
	return nil
}
