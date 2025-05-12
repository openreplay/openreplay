package datasaver

import (
	"context"
	"encoding/json"
	"openreplay/backend/pkg/db/types"

	"openreplay/backend/internal/config/db"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/postgres"
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

func New(log logger.Logger, cfg *db.Config, pg *postgres.Conn, ch clickhouse.Connector, session sessions.Sessions, tags tags.Tags) Saver {
	switch {
	case pg == nil:
		log.Fatal(context.Background(), "pg pool is empty")
	case ch == nil:
		log.Fatal(context.Background(), "ch pool is empty")
	}
	s := &saverImpl{
		log:      log,
		cfg:      cfg,
		pg:       pg,
		ch:       ch,
		sessions: session,
		tags:     tags,
	}
	s.init()
	return s
}

func (s *saverImpl) Handle(msg Message) {
	var (
		sessCtx = context.WithValue(context.Background(), "sessionID", msg.SessionID())
		session *sessions.Session
		err     error
	)
	if msg.TypeID() == MsgSessionEnd || msg.TypeID() == MsgMobileSessionEnd {
		session, err = s.sessions.GetUpdated(msg.SessionID(), true)
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
				s.log.Info(sessCtx, "custom event timestamp received: %v", m.Timestamp)
				msg.Meta().Timestamp = customPayload.CustomTimestamp
				s.log.Info(sessCtx, "custom event timestamp updated: %v", m.Timestamp)
			}
		}
		defer s.Handle(types.WrapCustomEvent(m))
	}

	if IsMobileType(msg.TypeID()) {
		if err := s.handleMobileMessage(sessCtx, session, msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				s.log.Error(sessCtx, "mobile message insertion error, msg: %+v, err: %.200s", msg, err)
			}
			return
		}
	} else {
		if err := s.handleWebMessage(sessCtx, session, msg); err != nil {
			if !postgres.IsPkeyViolation(err) {
				s.log.Error(sessCtx, "web message insertion error, msg: %+v, err: %.200s", msg, err)
			}
			return
		}
	}

	s.sendToFTS(msg, session.ProjectID)
	return
}

func (s *saverImpl) Commit() error {
	s.pg.Commit()
	s.ch.Commit()
	return nil
}

func (s *saverImpl) Close() error {
	if err := s.pg.Close(); err != nil {
		s.log.Error(context.Background(), "pg.Close error: %s", err)
	}
	if err := s.ch.Stop(); err != nil {
		s.log.Error(context.Background(), "ch.Close error: %s", err)
	}
	return nil
}
