package datasaver

import (
	"context"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/logger"
	. "openreplay/backend/pkg/messages"
	queue "openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/sessions"
	"openreplay/backend/pkg/tags"
)

type Saver interface {
	Handle(msg Message)
	Commit() error
	Close() error
}

type saverImpl struct {
	log      logger.Logger
	cfg      *db.Config
	pg       *postgres.Conn
	sessions sessions.Sessions
	ch       clickhouse.Connector
	producer queue.Producer
	tags     tags.Tags
}

func New(log logger.Logger, cfg *db.Config, pg *postgres.Conn, session sessions.Sessions, tags tags.Tags) Saver {
	s := &saverImpl{
		log:      log,
		cfg:      cfg,
		pg:       pg,
		sessions: session,
		tags:     tags,
	}
	s.init()
	return s
}

func (s *saverImpl) Handle(msg Message) {
	sessCtx := context.WithValue(context.Background(), "sessionID", msg.SessionID())
	if msg.TypeID() == MsgCustomEvent {
		defer s.Handle(types.WrapCustomEvent(msg.(*CustomEvent)))
	}
	if IsMobileType(msg.TypeID()) {
		// Handle Mobile messages
		if err := s.handleMobileMessage(msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				s.log.Error(sessCtx, "mobile message insertion error, msg: %+v, err: %s", msg, err)
			}
			return
		}
	} else {
		// Handle Web messages
		if err := s.handleMessage(msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				s.log.Error(sessCtx, "web message insertion error, msg: %+v, err: %s", msg, err)
			}
			return
		}
	}

	if err := s.handleExtraMessage(msg); err != nil {
		s.log.Error(sessCtx, "extra message insertion error, msg: %+v, err: %s", msg, err)
	}
	return
}

func (s *saverImpl) handleMobileMessage(msg Message) error {
	session, err := s.sessions.Get(msg.SessionID())
	if err != nil {
		return err
	}
	switch m := msg.(type) {
	case *MobileUserID:
		if err = s.sessions.UpdateUserID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERID_MOBILE", m.ID)
		return nil
	case *MobileUserAnonymousID:
		if err = s.sessions.UpdateAnonymousID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERANONYMOUSID_MOBILE", m.ID)
		return nil
	case *MobileMetadata:
		return s.sessions.UpdateMetadata(m.SessionID(), m.Key, m.Value)
	case *MobileEvent:
		return s.pg.InsertMobileEvent(session, m)
	case *MobileClickEvent:
		if err := s.pg.InsertMobileClickEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *MobileSwipeEvent:
		if err := s.pg.InsertMobileSwipeEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *MobileInputEvent:
		if err := s.pg.InsertMobileInputEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *MobileNetworkCall:
		return s.pg.InsertMobileNetworkCall(session, m)
	case *MobileCrash:
		if err := s.pg.InsertMobileCrash(session.SessionID, session.ProjectID, m); err != nil {
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
	sessCtx := context.WithValue(context.Background(), "sessionID", msg.SessionID())
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
		s.sessions.UpdateUTM(session.SessionID, m.URL)
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 1)
	case *NetworkRequest:
		return s.pg.InsertWebNetworkRequest(session, m)
	case *GraphQL:
		return s.pg.InsertWebGraphQL(session, m)
	case *JSException:
		wrapper, err := types.WrapJSException(m)
		if err != nil {
			s.log.Warn(sessCtx, "error on wrapping JSException: %v", err)
		}
		if err = s.pg.InsertWebErrorEvent(session, wrapper); err != nil {
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
			s.log.Error(context.Background(), "pg.Close error: %s", err)
		}
	}
	if s.ch != nil {
		if err := s.ch.Stop(); err != nil {
			s.log.Error(context.Background(), "ch.Close error: %s", err)
		}
	}
	return nil
}
