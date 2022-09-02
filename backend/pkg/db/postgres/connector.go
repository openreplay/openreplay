package postgres

import (
	"context"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/monitoring"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type CH interface {
	InsertAutocomplete(session *types.Session, msgType, msgValue string) error
}

type batchItem struct {
	query     string
	arguments []interface{}
}

// Conn contains batches, bulks and cache for all sessions
type Conn struct {
	c                 Pool
	batches           map[uint64]*pgx.Batch
	batchSizes        map[uint64]int
	rawBatches        map[uint64][]*batchItem
	autocompletes     Bulk
	requests          Bulk
	customEvents      Bulk
	webPageEvents     Bulk
	webInputEvents    Bulk
	webGraphQLEvents  Bulk
	sessionUpdates    map[uint64]*sessionUpdates
	batchQueueLimit   int
	batchSizeLimit    int
	batchSizeBytes    syncfloat64.Histogram
	batchSizeLines    syncfloat64.Histogram
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
	chConn            CH
}

func (conn *Conn) SetClickHouse(ch CH) {
	conn.chConn = ch
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
		batches:         make(map[uint64]*pgx.Batch),
		batchSizes:      make(map[uint64]int),
		rawBatches:      make(map[uint64][]*batchItem),
		sessionUpdates:  make(map[uint64]*sessionUpdates),
		batchQueueLimit: queueLimit,
		batchSizeLimit:  sizeLimit,
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
	conn.batchSizeBytes, err = metrics.RegisterHistogram("batch_size_bytes")
	if err != nil {
		log.Printf("can't create batchSizeBytes metric: %s", err)
	}
	conn.batchSizeLines, err = metrics.RegisterHistogram("batch_size_lines")
	if err != nil {
		log.Printf("can't create batchSizeLines metric: %s", err)
	}
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
	if conn.chConn == nil {
		return
	}
	// Send autocomplete data to clickhouse
	if err := conn.chConn.InsertAutocomplete(&types.Session{SessionID: sessionID, ProjectID: projectID}, tp, value); err != nil {
		log.Printf("click house autocomplete err: %s", err)
	}
}

func (conn *Conn) batchQueue(sessionID uint64, sql string, args ...interface{}) {
	batch, ok := conn.batches[sessionID]
	if !ok {
		conn.batches[sessionID] = &pgx.Batch{}
		conn.rawBatches[sessionID] = make([]*batchItem, 0)
		batch = conn.batches[sessionID]
	}
	batch.Queue(sql, args...)
	conn.rawBatch(sessionID, sql, args...)
}

func (conn *Conn) rawBatch(sessionID uint64, sql string, args ...interface{}) {
	// Temp raw batch store
	raw := conn.rawBatches[sessionID]
	raw = append(raw, &batchItem{
		query:     sql,
		arguments: args,
	})
	conn.rawBatches[sessionID] = raw
}

func (conn *Conn) updateSessionEvents(sessionID uint64, events, pages int) {
	if _, ok := conn.sessionUpdates[sessionID]; !ok {
		conn.sessionUpdates[sessionID] = NewSessionUpdates(sessionID)
	}
	conn.sessionUpdates[sessionID].add(pages, events)
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
	for sessID, b := range conn.batches {
		// Append session update sql request to the end of batch
		if update, ok := conn.sessionUpdates[sessID]; ok {
			sql, args := update.request()
			if sql != "" {
				conn.batchQueue(sessID, sql, args...)
				b, _ = conn.batches[sessID]
			}
		}
		// Record batch size in bytes and number of lines
		conn.batchSizeBytes.Record(context.Background(), float64(conn.batchSizes[sessID]))
		conn.batchSizeLines.Record(context.Background(), float64(b.Len()))

		start := time.Now()
		isFailed := false

		// Send batch to db and execute
		br := conn.c.SendBatch(b)
		l := b.Len()
		for i := 0; i < l; i++ {
			if ct, err := br.Exec(); err != nil {
				log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessID, err)
				failedSql := conn.rawBatches[sessID][i]
				query := strings.ReplaceAll(failedSql.query, "\n", " ")
				log.Println("failed sql req:", query, failedSql.arguments)
				isFailed = true
			}
		}
		br.Close() // returns err
		conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
		conn.sqlRequestCounter.Add(context.Background(), 1,
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
		if !isFailed {
			delete(conn.sessionUpdates, sessID)
		}
	}
	conn.batches = make(map[uint64]*pgx.Batch)
	conn.batchSizes = make(map[uint64]int)
	conn.rawBatches = make(map[uint64][]*batchItem)

	// Session updates
	for sessID, su := range conn.sessionUpdates {
		sql, args := su.request()
		if sql == "" {
			continue
		}
		if err := conn.c.Exec(sql, args...); err != nil {
			log.Printf("failed session update, sessID: %d, err: %s", sessID, err)
		}
	}
	conn.sessionUpdates = make(map[uint64]*sessionUpdates)
}

func (conn *Conn) updateBatchSize(sessionID uint64, reqSize int) {
	conn.batchSizes[sessionID] += reqSize
	if conn.batchSizes[sessionID] >= conn.batchSizeLimit || conn.batches[sessionID].Len() >= conn.batchQueueLimit {
		conn.commitBatch(sessionID)
	}
}

// Send only one batch to pg
func (conn *Conn) commitBatch(sessionID uint64) {
	b, ok := conn.batches[sessionID]
	if !ok {
		log.Printf("can't find batch for session: %d", sessionID)
		return
	}
	// Append session update sql request to the end of batch
	if update, ok := conn.sessionUpdates[sessionID]; ok {
		sql, args := update.request()
		if sql != "" {
			conn.batchQueue(sessionID, sql, args...)
			b, _ = conn.batches[sessionID]
		}
	}
	// Record batch size in bytes and number of lines
	conn.batchSizeBytes.Record(context.Background(), float64(conn.batchSizes[sessionID]))
	conn.batchSizeLines.Record(context.Background(), float64(b.Len()))

	start := time.Now()
	isFailed := false

	// Send batch to db and execute
	br := conn.c.SendBatch(b)
	l := b.Len()
	for i := 0; i < l; i++ {
		if ct, err := br.Exec(); err != nil {
			log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessionID, err)
			failedSql := conn.rawBatches[sessionID][i]
			query := strings.ReplaceAll(failedSql.query, "\n", " ")
			log.Println("failed sql req:", query, failedSql.arguments)
			isFailed = true
		}
	}
	br.Close()

	conn.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
	conn.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "batch"), attribute.Bool("failed", isFailed))

	// Clean batch info
	delete(conn.batches, sessionID)
	delete(conn.batchSizes, sessionID)
	delete(conn.rawBatches, sessionID)
	delete(conn.sessionUpdates, sessionID)
}
