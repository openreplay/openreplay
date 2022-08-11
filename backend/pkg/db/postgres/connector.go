package postgres

import (
	"context"
	"github.com/jackc/pgx/v4/pgxpool"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	"openreplay/backend/pkg/monitoring"
)

// Conn contains batches, bulks and cache for all sessions
type Conn struct {
	c                 Pool
	batches           *BatchSet
	autocompletes     Bulk
	requests          Bulk
	customEvents      Bulk
	webPageEvents     Bulk
	webInputEvents    Bulk
	webGraphQLEvents  Bulk
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
}

func NewConn(url string, queueLimit, sizeLimit int, metrics *monitoring.Metrics) *Conn {
	if metrics == nil {
		log.Fatalf("metrics is nil")
	}
	c, err := pgxpool.Connect(context.Background(), url)
	if err != nil {
		log.Println(err)
		log.Fatalln("pgxpool.Connect Error")
	}
	conn := &Conn{
		batches: NewBatchSet(queueLimit, sizeLimit, metrics),
	}
	conn.initMetrics(metrics)
	conn.c, err = NewPool(c, conn.sqlRequestTime, conn.sqlRequestCounter)
	if err != nil {
		log.Fatalf("can't create new pool wrapper: %s", err)
	}
	conn.initBulks()
	return conn
}

func (conn *Conn) Close() error {
	conn.c.Close()
	return nil
}

func (conn *Conn) initMetrics(metrics *monitoring.Metrics) {
	var err error
	conn.sqlRequestTime, err = metrics.RegisterHistogram("sql_request_time")
	if err != nil {
		log.Printf("can't create sqlRequestTime metric: %s", err)
	}
	conn.sqlRequestCounter, err = metrics.RegisterCounter("sql_request_number")
	if err != nil {
		log.Printf("can't create sqlRequestNumber metric: %s", err)
	}
}

func (conn *Conn) initBulks() {
	var err error
	conn.autocompletes, err = NewBulk(conn.c,
		"autocomplete",
		"(value, type, project_id)",
		"($%d, $%d, $%d)",
		3, 100)
	if err != nil {
		log.Fatalf("can't create autocomplete bulk")
	}
	conn.requests, err = NewBulk(conn.c,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, duration, success)",
		"($%d, $%d, $%d, left($%d, 2700), $%d, $%d)",
		6, 100)
	if err != nil {
		log.Fatalf("can't create requests bulk")
	}
	conn.customEvents, err = NewBulk(conn.c,
		"events_common.customs",
		"(session_id, timestamp, seq_index, name, payload)",
		"($%d, $%d, $%d, left($%d, 2700), $%d)",
		5, 100)
	if err != nil {
		log.Fatalf("can't create customEvents bulk")
	}
	conn.webPageEvents, err = NewBulk(conn.c,
		"events.pages",
		"(session_id, message_id, timestamp, referrer, base_referrer, host, path, query, dom_content_loaded_time, "+
			"load_time, response_end, first_paint_time, first_contentful_paint_time, speed_index, visually_complete, "+
			"time_to_interactive, response_time, dom_building_time)",
		"($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0),"+
			" NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0))",
		18, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}
	conn.webInputEvents, err = NewBulk(conn.c,
		"events.inputs",
		"(session_id, message_id, timestamp, value, label)",
		"($%d, $%d, $%d, $%d, NULLIF($%d,''))",
		5, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}
	conn.webGraphQLEvents, err = NewBulk(conn.c,
		"events.graphql",
		"(session_id, timestamp, message_id, name, request_body, response_body)",
		"($%d, $%d, $%d, left($%d, 2700), $%d, $%d)",
		6, 100)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk")
	}
}

func (conn *Conn) insertAutocompleteValue(sessionID uint64, projectID uint32, tp string, value string) {
	if len(value) == 0 {
		return
	}
	if err := conn.autocompletes.Append(value, tp, projectID); err != nil {
		log.Printf("autocomplete bulk err: %s", err)
	}
}

func (conn *Conn) batchQueue(sessionID uint64, sql string, args ...interface{}) {
	conn.batches.batchQueue(sessionID, sql, args)
}

func (conn *Conn) updateSessionEvents(sessionID uint64, events, pages int) {
	conn.batches.updateSessionEvents(sessionID, events, pages)
}

func (conn *Conn) sendBulks() {
	if err := conn.autocompletes.Send(); err != nil {
		log.Printf("autocomplete bulk send err: %s", err)
	}
	if err := conn.requests.Send(); err != nil {
		log.Printf("requests bulk send err: %s", err)
	}
	if err := conn.customEvents.Send(); err != nil {
		log.Printf("customEvents bulk send err: %s", err)
	}
	if err := conn.webPageEvents.Send(); err != nil {
		log.Printf("webPageEvents bulk send err: %s", err)
	}
	if err := conn.webInputEvents.Send(); err != nil {
		log.Printf("webInputEvents bulk send err: %s", err)
	}
	if err := conn.webGraphQLEvents.Send(); err != nil {
		log.Printf("webGraphQLEvents bulk send err: %s", err)
	}
}

func (conn *Conn) CommitBatches() {
	conn.sendBulks()
	conn.batches.CommitBatches(conn.c)
}

func (conn *Conn) updateBatchSize(sessionID uint64, reqSize int) {
	conn.batches.updateBatchSize(sessionID, reqSize, conn.c)
}

// Send only one batch to pg
func (conn *Conn) commitBatch(sessionID uint64) {
	conn.batches.commitBatch(sessionID, conn.c)
}
