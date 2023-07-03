package datasaver

import (
	"errors"
	"log"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	. "openreplay/backend/pkg/messages"
	queue "openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
)

type Saver interface {
	Handle(msg Message)
	Commit() error
	Close() error
}

type saverImpl struct {
	cfg      *db.Config
	pg       *postgres.Conn
	sessions sessions.Sessions
	ch       clickhouse.Connector
	producer queue.Producer
}

func New(cfg *db.Config, pg *postgres.Conn, session sessions.Sessions) Saver {
	s := &saverImpl{
		cfg:      cfg,
		pg:       pg,
		sessions: session,
	}
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
	case *SessionStart:
		return s.pg.HandleStartEvent(m)
	case *SessionEnd:
		return s.pg.HandleEndEvent(m.SessionID())
	case *Metadata:
		return s.sessions.UpdateMetadata(m.SessionID(), m.Key, m.Value)
	case *IssueEvent:
		if err = s.pg.InsertIssueEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 0, postgres.GetIssueScore(m))
	case *CustomIssue:
		ie := &IssueEvent{
			Type:          "custom",
			Timestamp:     m.Timestamp,
			MessageID:     m.Index,
			ContextString: m.Name,
			Payload:       m.Payload,
		}
		ie.SetMeta(m.Meta())
		if err = s.pg.InsertIssueEvent(session, ie); err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 0, postgres.GetIssueScore(ie))
	case *UserID:
		if err = s.sessions.UpdateUserID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERID", m.ID)
		return nil
	case *UserAnonymousID:
		if err = s.sessions.UpdateAnonymousID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERANONYMOUSID", m.ID)
		return nil
	case *CustomEvent:
		return s.pg.InsertWebCustomEvent(session, m)
	case *MouseClick:
		if err = s.pg.InsertWebClickEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *InputEvent:
		if err = s.pg.InsertWebInputEvent(session, m); err != nil {
			if errors.Is(err, postgres.EmptyLabel) {
				return nil
			}
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *PageEvent:
		if err = s.pg.InsertWebPageEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 1)
	case *NetworkRequest:
		return s.pg.InsertWebNetworkRequest(session, m)
	case *GraphQL:
		return s.pg.InsertWebGraphQL(session, m)
	case *JSException:
		if err = s.pg.InsertWebErrorEvent(session, types.WrapJSException(m)); err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 0, 1000)
	case *IntegrationEvent:
		return s.pg.InsertWebErrorEvent(session, types.WrapIntegrationEvent(m))
	case *InputChange:
		if err = s.pg.InsertInputChangeEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *MouseThrashing:
		if err = s.pg.InsertMouseThrashing(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 0, 50)
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
