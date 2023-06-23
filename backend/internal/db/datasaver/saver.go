package datasaver

import (
	"log"
	"openreplay/backend/pkg/db/sessions"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/cache"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
	queue "openreplay/backend/pkg/queue/types"
)

type Saver interface {
	Handle(msg Message)
	Commit() error
	Close() error
}

type saverImpl struct {
	cfg      *db.Config
	pg       *cache.PGCache
	sessions sessions.Sessions
	ch       clickhouse.Connector
	producer queue.Producer
}

func New(cfg *db.Config, pg *cache.PGCache) Saver {
	s := &saverImpl{cfg: cfg, pg: pg}
	s.init()
	return s
}

func (s *saverImpl) Handle(msg Message) {
	if msg.TypeID() == MsgCustomEvent {
		defer s.Handle(types.WrapCustomEvent(msg.(*CustomEvent)))
	}
	if err := s.handleMessage(msg); err != nil {
		if !postgres.IsPkeyViolation(err) {
			log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
		}
		return
	}
	if err := s.handleExtraMessage(msg); err != nil {
		log.Printf("Stats Insertion Error %v; Session: %d, Message: %v", err, msg.SessionID(), msg)
	}
	return
}

func (s *saverImpl) handleMessage(msg Message) error {
	session, err := s.sessions.Get(msg.SessionID())
	if err != nil {
		return err
	}
	switch m := msg.(type) {
	case *Metadata:
		return s.sessions.InsertMetadata(m)
	case *IssueEvent:
		return s.pg.Conn.InsertIssueEvent(session, m)
	case *CustomIssue:
		ie := &IssueEvent{
			Type:          "custom",
			Timestamp:     m.Timestamp,
			MessageID:     m.Index,
			ContextString: m.Name,
			Payload:       m.Payload,
		}
		ie.SetMeta(m.Meta())
		return s.pg.InsertIssueEvent(session, ie)
	case *SessionStart:
		return s.pg.Conn.HandleSessionStart(m)
	case *SessionEnd:
		return s.pg.Conn.HandleSessionEnd(m.SessionID())
	case *UserID:
		return s.pg.Conn.InsertWebUserID(session, m)
	case *UserAnonymousID:
		return s.pg.Conn.InsertWebUserAnonymousID(session, m)
	case *CustomEvent:
		return s.pg.Conn.InsertWebCustomEvent(session, m)
	case *MouseClick:
		return s.pg.Conn.InsertWebClickEvent(session, m)
	case *InputEvent:
		return s.pg.Conn.InsertWebInputEvent(session, m)
	case *PageEvent:
		return s.pg.Conn.InsertWebPageEvent(session, m)
	case *NetworkRequest:
		return s.pg.Conn.InsertWebNetworkRequest(session, m)
	case *GraphQL:
		return s.pg.Conn.InsertWebGraphQL(session, m)
	case *JSException:
		return s.pg.Conn.InsertWebErrorEvent(session, types.WrapJSException(m))
	case *IntegrationEvent:
		return s.pg.Conn.InsertWebErrorEvent(session, types.WrapIntegrationEvent(m))
	case *InputChange:
		return s.pg.Conn.InsertWebInputDuration(session, m)
	case *MouseThrashing:
		return s.pg.Conn.InsertMouseThrashing(session, m)
	}
	return nil
}

func (s *saverImpl) Commit() error {
	if s.pg != nil {
		s.pg.Commit()
	}
	if s.ch != nil {
		s.ch.Commit()
	}
	return nil
}

func (s *saverImpl) Close() error {
	if s.pg != nil {
		if err := s.pg.Close(); err != nil {
			log.Printf("pg.Close error: %s", err)
		}
	}
	if s.ch != nil {
		if err := s.ch.Stop(); err != nil {
			log.Printf("ch.Close error: %s", err)
		}
	}
	return nil
}
