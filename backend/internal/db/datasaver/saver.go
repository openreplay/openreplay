package datasaver

import (
	"context"
	"encoding/json"
	"openreplay/backend/pkg/sdk/service"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/canvas"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/issues"
	"openreplay/backend/pkg/logger"
	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/metrics/database"
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
	sessions sessions.Sessions
	issues   issues.Issues
	ch       clickhouse.Connector
	producer queue.Producer
	tags     tags.Tags
	canvases canvas.Canvases
	users    service.Users
	builders *builders
	metrics  database.Database
}

func New(log logger.Logger, cfg *db.Config, ch clickhouse.Connector, session sessions.Sessions, issues issues.Issues, tags tags.Tags, canvases canvas.Canvases, users service.Users, metrics database.Database) Saver {
	if ch == nil {
		log.Fatal(context.Background(), "ch pool is empty")
	}
	s := &saverImpl{
		log:      log,
		cfg:      cfg,
		ch:       ch,
		sessions: session,
		issues:   issues,
		tags:     tags,
		canvases: canvases,
		users:    users,
		metrics:  metrics,
	}
	s.builders = newBuilders(log, s.Handle)
	return s
}

func platformOf(msg Message) string {
	if IsMobileType(msg.TypeID()) {
		return "mobile"
	}
	return "web"
}

func (s *saverImpl) Handle(msg Message) {
	s.builders.Handle(msg)

	var (
		sessCtx = context.WithValue(context.Background(), "sessionID", msg.SessionID())
		session *sessions.Session
		err     error
	)
	if msg.TypeID() == MsgSessionEnd || msg.TypeID() == MsgMobileSessionEnd {
		s.log.Info(sessCtx, "SE_TRACE stage=db_received sessID=%d", msg.SessionID())
		issueTypes, err := s.issues.Get(msg.SessionID())
		if err != nil {
			s.log.Warn(sessCtx, "issue types get error: %s", err)
		}
		session, err = s.sessions.GetWithUpdatedIssueTypes(msg.SessionID(), issueTypes)
	} else {
		session, err = s.sessions.Get(msg.SessionID())
	}
	if err != nil || session == nil {
		if msg.TypeID() == MsgSessionEnd || msg.TypeID() == MsgMobileSessionEnd {
			s.log.Error(sessCtx, "SE_TRACE stage=db_dropped reason=no_session sessID=%d err=%v", msg.SessionID(), err)
		}
		s.metrics.IncreaseSaverMessages(platformOf(msg), database.MessageNoSession)
		s.log.Error(sessCtx, "error on session retrieving from cache: %v, SessionID: %v, Message: %v", err, msg.SessionID(), msg)
		return
	}

	if msg.TypeID() == MsgCustomEvent {
		m := msg.(*CustomEvent)
		// Try to parse custom event payload to JSON and extract or_payload field
		type CustomEventPayload struct {
			CustomTimestamp uint64 `json:"or_timestamp"`
		}
		customPayload := &CustomEventPayload{}
		if err := json.Unmarshal([]byte(m.Payload), customPayload); err == nil {
			if customPayload.CustomTimestamp >= session.Timestamp {
				msg.Meta().Timestamp = customPayload.CustomTimestamp
			}
		}
		defer s.Handle(types.WrapCustomEvent(m))
	}

	if IsMobileType(msg.TypeID()) {
		if err := s.handleMobileMessage(session, msg); err != nil {
			if postgres.IsPkeyViolation(err) {
				s.metrics.IncreaseSaverMessages("mobile", database.MessageDuplicate)
			} else {
				s.metrics.IncreaseSaverMessages("mobile", database.MessageError)
				s.log.Error(sessCtx, "mobile message insertion error, msg: %+v, err: %.200s", msg, err)
			}
			return
		}
		s.metrics.IncreaseSaverMessages("mobile", database.MessageSaved)
	} else {
		if err := s.handleWebMessage(session, msg); err != nil {
			if postgres.IsPkeyViolation(err) {
				s.metrics.IncreaseSaverMessages("web", database.MessageDuplicate)
			} else {
				s.metrics.IncreaseSaverMessages("web", database.MessageError)
				s.log.Error(sessCtx, "web message insertion error, msg: %+v, err: %.200s", msg, err)
			}
			return
		}
		s.metrics.IncreaseSaverMessages("web", database.MessageSaved)
	}
	return
}

func (s *saverImpl) Commit() error {
	s.builders.maybeSweep()
	if err := s.canvases.Commit(); err != nil {
		s.log.Error(context.Background(), "canvas commit error: %v", err)
	}
	return s.ch.Commit()
}

func (s *saverImpl) Close() error {
	s.builders.flushAll()
	if err := s.issues.Flush(); err != nil {
		s.log.Error(context.Background(), "issues flush error: %s", err)
	}
	if err := s.ch.Stop(); err != nil {
		s.log.Error(context.Background(), "ch.Close error: %s", err)
	}
	s.sessions.Commit()
	return nil
}
