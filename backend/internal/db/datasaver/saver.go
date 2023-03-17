package datasaver

import (
	"log"

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
	switch m := msg.(type) {
	case *Metadata:
		return s.pg.InsertMetadata(m)
	case *IssueEvent:
		return s.pg.InsertIssueEvent(m)
	case *SessionStart:
		return s.pg.HandleWebSessionStart(m)
	case *SessionEnd:
		return s.pg.HandleWebSessionEnd(m)
	case *UserID:
		return s.pg.InsertWebUserID(m)
	case *UserAnonymousID:
		return s.pg.InsertWebUserAnonymousID(m)
	case *CustomEvent:
		return s.pg.InsertWebCustomEvent(m)
	case *MouseClick:
		return s.pg.InsertWebClickEvent(m)
	case *InputEvent:
		return s.pg.InsertWebInputEvent(m)
	case *PageEvent:
		return s.pg.InsertWebPageEvent(m)
	case *NetworkRequest:
		return s.pg.InsertWebNetworkRequest(m)
	case *GraphQL:
		return s.pg.InsertWebGraphQL(m)
	case *JSException:
		return s.pg.InsertWebJSException(m)
	case *IntegrationEvent:
		return s.pg.InsertWebIntegrationEvent(m)
	case *InputChange:
		return s.pg.InsertWebInputDuration(m)
	case *MouseThrashing:
		return s.pg.InsertMouseThrashing(m)
	case *IOSSessionStart:
		return s.pg.InsertIOSSessionStart(m)
	case *IOSSessionEnd:
		return s.pg.InsertIOSSessionEnd(m)
	case *IOSUserID:
		return s.pg.InsertIOSUserID(m)
	case *IOSUserAnonymousID:
		return s.pg.InsertIOSUserAnonymousID(m)
	case *IOSCustomEvent:
		return s.pg.InsertIOSCustomEvent(m)
	case *IOSClickEvent:
		return s.pg.InsertIOSClickEvent(m)
	case *IOSInputEvent:
		return s.pg.InsertIOSInputEvent(m)
	case *IOSNetworkCall:
		return s.pg.InsertIOSNetworkCall(m)
	case *IOSScreenEnter:
		return s.pg.InsertIOSScreenEnter(m)
	case *IOSCrash:
		return s.pg.InsertIOSCrash(m)
	case *UnbindNodes:
		log.Printf("UnbindNodes: %+v", m)
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
