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
		return si.ch.InsertWebSession(m)
	case *messages.PerformanceTrackAggr:
		return si.ch.InsertWebPerformanceTrackAggr(m)
	case *messages.MouseClick:
		return si.ch.InsertWebClickEvent(m)
	case *messages.InputEvent:
		return si.ch.InsertWebInputEvent(m)
	// Unique for Web
	case *messages.PageEvent:
		return si.ch.InsertWebPageEvent(m)
	case *messages.ResourceTiming:
		return si.ch.InsertWebResourceEvent(m)
	case *messages.JSException:
		return si.ch.InsertWebErrorEvent(types.WrapJSException(m))
	case *messages.IntegrationEvent:
		return si.ch.InsertWebErrorEvent(types.WrapIntegrationEvent(m))
	}
	return nil
}

func (si *Saver) CommitStats() error {
	return si.ch.Commit()
}

func (si *Saver) Close() error {
	return si.ch.Stop()
}
