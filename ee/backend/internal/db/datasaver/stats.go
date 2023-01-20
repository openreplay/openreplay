package datasaver

import (
	"log"
	"openreplay/backend/pkg/db/clickhouse"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
)

func (si *Saver) InitStats() {
	si.ch = clickhouse.NewConnector(env.String("CLICKHOUSE_STRING"))
	if err := si.ch.Prepare(); err != nil {
		log.Fatalf("Clickhouse prepare error: %v\n", err)
	}
	si.pg.Conn.SetClickHouse(si.ch)
}

func (si *Saver) InsertStats(session *types.Session, msg messages.Message) error {
	// Send data to quickwit
	if sess, err := si.pg.Cache.GetSession(msg.SessionID()); err != nil {
		si.SendToFTS(msg, 0)
	} else {
		si.SendToFTS(msg, sess.ProjectID)
	}

	switch m := msg.(type) {
	// Web
	case *messages.SessionEnd:
		return si.ch.InsertWebSession(session)
	case *messages.PerformanceTrackAggr:
		return si.ch.InsertWebPerformanceTrackAggr(session, m)
	case *messages.ClickEvent:
		return si.ch.InsertWebClickEvent(session, m)
	case *messages.InputEvent:
		return si.ch.InsertWebInputEvent(session, m)
	// Unique for Web
	case *messages.PageEvent:
		return si.ch.InsertWebPageEvent(session, m)
	case *messages.ResourceEvent:
		return si.ch.InsertWebResourceEvent(session, m)
	case *messages.JSException:
		return si.ch.InsertWebErrorEvent(session, types.WrapJSException(m))
	case *messages.IntegrationEvent:
		return si.ch.InsertWebErrorEvent(session, types.WrapIntegrationEvent(m))
	}
	return nil
}

func (si *Saver) CommitStats() error {
	return si.ch.Commit()
}
