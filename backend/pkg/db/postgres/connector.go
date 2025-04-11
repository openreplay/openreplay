package postgres

import (
	"context"
	"openreplay/backend/pkg/metrics/database"

	"openreplay/backend/pkg/db/postgres/batch"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/sessions"
)

type CH interface {
	InsertAutocomplete(session *sessions.Session, msgType, msgValue string) error
}

// Conn contains batches, bulks and cache for all sessions
type Conn struct {
	log     logger.Logger
	Pool    pool.Pool
	batches *batch.BatchSet
	bulks   *BulkSet
	chConn  CH
}

func NewConn(log logger.Logger, pool pool.Pool, ch CH, metrics database.Database) *Conn {
	if pool == nil {
		log.Fatal(context.Background(), "pg pool is empty")
	}
	return &Conn{
		log:     log,
		Pool:    pool,
		chConn:  ch,
		bulks:   NewBulkSet(log, pool, metrics),
		batches: batch.NewBatchSet(log, pool, metrics),
	}
}

func (conn *Conn) Close() error {
	conn.bulks.Stop()
	conn.batches.Stop()
	return nil
}

func (conn *Conn) InsertAutocompleteValue(sessionID uint64, projectID uint32, tp string, value string) {
	if len(value) == 0 {
		return
	}
	if err := conn.bulks.Get("autocompletes").Append(value, tp, projectID); err != nil {
		conn.log.Error(context.Background(), "can't add autocomplete to PG, err: %s", err)
	}
	if conn.chConn == nil {
		return
	}
	// Send autocomplete data to clickhouse
	if err := conn.chConn.InsertAutocomplete(&sessions.Session{SessionID: sessionID, ProjectID: projectID}, tp, value); err != nil {
		conn.log.Error(context.Background(), "can't add autocomplete to CH, err: %s", err)
	}
}

func (conn *Conn) BatchQueue(sessionID uint64, sql string, args ...interface{}) {
	conn.batches.BatchQueue(sessionID, sql, args...)
}

func (conn *Conn) Commit() {
	conn.bulks.Send()
	conn.batches.Commit()
}
