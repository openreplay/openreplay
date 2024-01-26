package datasaver

import (
	"log"
	"openreplay/backend/pkg/tags"

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
	tags     tags.Tags
}

func New(cfg *db.Config, pg *postgres.Conn, session sessions.Sessions, tags tags.Tags) Saver {
	s := &saverImpl{
		cfg:      cfg,
		pg:       pg,
		sessions: session,
		tags:     tags,
	}
	s.init()
	return s
}

func (s *saverImpl) Handle(msg Message) {
	if msg.TypeID() == MsgCustomEvent {
		defer s.Handle(types.WrapCustomEvent(msg.(*CustomEvent)))
	}
	if IsIOSType(msg.TypeID()) {
		// Handle iOS messages
		if err := s.handleMobileMessage(msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				log.Printf("iOS Message Insertion Error %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
			}
			return
		}
	} else {
		// Handle Web messages
		if err := s.handleMessage(msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				log.Printf("Message Insertion Error %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
			}
			return
		}
	}

	if err := s.handleExtraMessage(msg); err != nil {
		log.Printf("Stats Insertion Error %v; Session: %d, Message: %v", err, msg.SessionID(), msg)
	}
	return
}

func (s *saverImpl) handleMobileMessage(msg Message) error {
	session, err := s.sessions.Get(msg.SessionID())
	if err != nil {
		return err
	}
	switch m := msg.(type) {
	case *IOSSessionStart:
		return s.pg.InsertIOSSessionStart(m.SessionID(), m)
	case *IOSSessionEnd:
		return s.pg.InsertIOSSessionEnd(m.SessionID(), m)
	case *IOSUserID:
		if err = s.sessions.UpdateUserID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERID_IOS", m.ID)
		return nil
	case *IOSUserAnonymousID:
		if err = s.sessions.UpdateAnonymousID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERANONYMOUSID_IOS", m.ID)
		return nil
	case *IOSMetadata:
		return s.sessions.UpdateMetadata(m.SessionID(), m.Key, m.Value)
	case *IOSEvent:
		return s.pg.InsertIOSEvent(session, m)
	case *IOSClickEvent:
		if err := s.pg.InsertIOSClickEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *IOSSwipeEvent:
		if err := s.pg.InsertIOSSwipeEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *IOSInputEvent:
		if err := s.pg.InsertIOSInputEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *IOSNetworkCall:
		return s.pg.InsertIOSNetworkCall(session, m)
	case *IOSCrash:
		if err := s.pg.InsertIOSCrash(session.SessionID, session.ProjectID, m); err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 1, 1000)
	}
	return nil
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
		if m.Type == "dead_click" || m.Type == "click_rage" {
			if s.tags.ShouldIgnoreTag(session.ProjectID, m.Context) {
				return nil
			}
		}
		err = s.pg.InsertIssueEvent(session, m)
		if err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 0, postgres.GetIssueScore(m.Type))
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
		return s.sessions.UpdateIssuesStats(session.SessionID, 0, postgres.GetIssueScore(ie.Type))
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
	case *PageEvent:
		if err = s.pg.InsertWebPageEvent(session, m); err != nil {
			return err
		}
		s.sessions.UpdateReferrer(session.SessionID, m.Referrer)
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 1)
	case *NetworkRequest:
		return s.pg.InsertWebNetworkRequest(session, m)
	case *GraphQL:
		return s.pg.InsertWebGraphQL(session, m)
	case *JSException:
		if err = s.pg.InsertWebErrorEvent(session, types.WrapJSException(m)); err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 1, 1000)
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
	case *CanvasNode:
		if err = s.pg.InsertCanvasNode(session, m); err != nil {
			return err
		}
	case *TagTrigger:
		if err = s.pg.InsertTagTrigger(session, m); err != nil {
			return err
		}
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
