package postgres

import (
	"log"
	"openreplay/backend/pkg/db/postgres/batch"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/sessions"
)

type CH interface {
	InsertAutocomplete(session *sessions.Session, msgType, msgValue string) error
}

// Conn contains batches, bulks and cache for all sessions
type Conn struct {
	Pool    pool.Pool
	batches *batch.BatchSet
	bulks   *BulkSet
	chConn  CH // hack for autocomplete inserts, TODO: rewrite
}

func (conn *Conn) SetClickHouse(ch CH) {
	conn.chConn = ch
}

func NewConn(pool pool.Pool) *Conn {
	if pool == nil {
		log.Fatalf("pool is nil")
	}
	return &Conn{
		Pool:    pool,
		bulks:   NewBulkSet(pool),
		batches: batch.NewBatchSet(pool),
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
		log.Printf("autocomplete bulk err: %s", err)
	}
	if conn.chConn == nil {
		return
	}
	// Send autocomplete data to clickhouse
	if err := conn.chConn.InsertAutocomplete(&sessions.Session{SessionID: sessionID, ProjectID: projectID}, tp, value); err != nil {
		log.Printf("click house autocomplete err: %s", err)
	}
}

func (conn *Conn) BatchQueue(sessionID uint64, sql string, args ...interface{}) {
	conn.batches.BatchQueue(sessionID, sql, args...)
}

func (conn *Conn) Commit() {
	conn.bulks.Send()
	conn.batches.Commit()
}
