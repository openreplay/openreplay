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
}

func New(log logger.Logger, cfg *db.Config, ch clickhouse.Connector, session sessions.Sessions, issues issues.Issues, tags tags.Tags, canvases canvas.Canvases, users service.Users) Saver {
	if ch == nil {
		log.Fatal(context.Background(), "ch pool is empty")
	}
	return &saverImpl{
		log:      log,
		cfg:      cfg,
		ch:       ch,
		sessions: session,
		issues:   issues,
		tags:     tags,
		canvases: canvases,
		users:    users,
	}
}

func (s *saverImpl) Handle(msg Message) {
	var (
		sessCtx = context.WithValue(context.Background(), "sessionID", msg.SessionID())
		session *sessions.Session
		err     error
	)
	if msg.TypeID() == MsgSessionEnd || msg.TypeID() == MsgMobileSessionEnd {
		issueTypes, err := s.issues.Get(msg.SessionID())
		if err != nil {
			s.log.Warn(sessCtx, "issue types get error", err)
		}
		session, err = s.sessions.GetWithUpdatedIssueTypes(msg.SessionID(), issueTypes)
	} else {
		session, err = s.sessions.Get(msg.SessionID())
	}
	if err != nil || session == nil {
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
	s.addUserID(session)

	if IsMobileType(msg.TypeID()) {
		if err := s.handleMobileMessage(session, msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				s.log.Error(sessCtx, "mobile message insertion error, msg: %+v, err: %.200s", msg, err)
			}
			return
		}
	} else {
		if err := s.handleWebMessage(session, msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				s.log.Error(sessCtx, "web message insertion error, msg: %+v, err: %.200s", msg, err)
			}
			return
		}
	}
	return
}

func (s *saverImpl) addUserID(session *sessions.Session) {
	if session.UserID != nil {
		return
	}
	if userID, err := s.users.GetUserIDByDistinctID(session.ProjectID, session.UserUUID); err == nil {
		session.UserID = &userID
	}
}

func (s *saverImpl) Commit() error {
	if err := s.canvases.Commit(); err != nil {
		s.log.Error(context.Background(), "canvas commit error: %v", err)
	}
	return s.ch.Commit()
}

func (s *saverImpl) Close() error {
	if err := s.ch.Stop(); err != nil {
		s.log.Error(context.Background(), "ch.Close error: %s", err)
	}
	return nil
}
