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
	webGraphQL        Bulk
	webErrors         Bulk
	webErrorEvents    Bulk
	webErrorTags      Bulk
	webIssues         Bulk
	webIssueEvents    Bulk
	webCustomEvents   Bulk
	webClickEvents    Bulk
	webNetworkRequest Bulk
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
		log.Fatalf("pgxpool.Connect err: %s", err)
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
	conn.initBulks(metrics)
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

func (conn *Conn) initBulks(metrics *monitoring.Metrics) {
	var err error
	conn.autocompletes, err = NewBulk(conn.c, metrics,
		"autocomplete",
		"(value, type, project_id)",
		"($%d, $%d, $%d)",
		3, 200)
	if err != nil {
		log.Fatalf("can't create autocomplete bulk: %s", err)
	}
	conn.requests, err = NewBulk(conn.c, metrics,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, duration, success)",
		"($%d, $%d, $%d, LEFT($%d, 8000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create requests bulk: %s", err)
	}
	conn.customEvents, err = NewBulk(conn.c, metrics,
		"events_common.customs",
		"(session_id, timestamp, seq_index, name, payload)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d)",
		5, 200)
	if err != nil {
		log.Fatalf("can't create customEvents bulk: %s", err)
	}
	conn.webPageEvents, err = NewBulk(conn.c, metrics,
		"events.pages",
		"(session_id, message_id, timestamp, referrer, base_referrer, host, path, query, dom_content_loaded_time, "+
			"load_time, response_end, first_paint_time, first_contentful_paint_time, speed_index, visually_complete, "+
			"time_to_interactive, response_time, dom_building_time)",
		"($%d, $%d, $%d, LEFT($%d, 8000), LEFT($%d, 8000), LEFT($%d, 300), LEFT($%d, 2000), LEFT($%d, 8000), "+
			"NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0),"+
			" NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0), NULLIF($%d, 0))",
		18, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webInputEvents, err = NewBulk(conn.c, metrics,
		"events.inputs",
		"(session_id, message_id, timestamp, value, label)",
		"($%d, $%d, $%d, LEFT($%d, 2000), NULLIF(LEFT($%d, 2000),''))",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webGraphQL, err = NewBulk(conn.c, metrics,
		"events.graphql",
		"(session_id, timestamp, message_id, name, request_body, response_body)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webPageEvents bulk: %s", err)
	}
	conn.webErrors, err = NewBulk(conn.c, metrics,
		"errors",
		"(error_id, project_id, source, name, message, payload)",
		"($%d, $%d, $%d, $%d, $%d, $%d::jsonb)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webErrors bulk: %s", err)
	}
	conn.webErrorEvents, err = NewBulk(conn.c, metrics,
		"events.errors",
		"(session_id, message_id, timestamp, error_id)",
		"($%d, $%d, $%d, $%d)",
		4, 200)
	if err != nil {
		log.Fatalf("can't create webErrorEvents bulk: %s", err)
	}
	conn.webErrorTags, err = NewBulk(conn.c, metrics,
		"public.errors_tags",
		"(session_id, message_id, error_id, key, value)",
		"($%d, $%d, $%d, $%d, $%d)",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webErrorEvents bulk: %s", err)
	}
	conn.webIssues, err = NewBulk(conn.c, metrics,
		"issues",
		"(project_id, issue_id, type, context_string)",
		"($%d, $%d, $%d, $%d)",
		4, 200)
	if err != nil {
		log.Fatalf("can't create webIssues bulk: %s", err)
	}
	conn.webIssueEvents, err = NewBulk(conn.c, metrics,
		"events_common.issues",
		"(session_id, issue_id, timestamp, seq_index, payload)",
		"($%d, $%d, $%d, $%d, CAST($%d AS jsonb))",
		5, 200)
	if err != nil {
		log.Fatalf("can't create webIssueEvents bulk: %s", err)
	}
	conn.webCustomEvents, err = NewBulk(conn.c, metrics,
		"events_common.customs",
		"(session_id, seq_index, timestamp, name, payload, level)",
		"($%d, $%d, $%d, LEFT($%d, 2000), $%d, $%d)",
		6, 200)
	if err != nil {
		log.Fatalf("can't create webCustomEvents bulk: %s", err)
	}
	conn.webClickEvents, err = NewBulk(conn.c, metrics,
		"events.clicks",
		"(session_id, message_id, timestamp, label, selector, url, path)",
		"($%d, $%d, $%d, NULLIF(LEFT($%d, 2000), ''), LEFT($%d, 8000), LEFT($%d, 2000), LEFT($%d, 2000))",
		7, 200)
	if err != nil {
		log.Fatalf("can't create webClickEvents bulk: %s", err)
	}
	conn.webNetworkRequest, err = NewBulk(conn.c, metrics,
		"events_common.requests",
		"(session_id, timestamp, seq_index, url, host, path, query, request_body, response_body, status_code, method, duration, success)",
		"($%d, $%d, $%d, LEFT($%d, 8000), LEFT($%d, 300), LEFT($%d, 2000), LEFT($%d, 8000), $%d, $%d, $%d::smallint, NULLIF($%d, '')::http_method, $%d, $%d)",
		13, 200)
	if err != nil {
		log.Fatalf("can't create webNetworkRequest bulk: %s", err)
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
	conn.sessionUpdates[sessionID].addEvents(pages, events)
}

func (conn *Conn) updateSessionIssues(sessionID uint64, errors, issueScore int) {
	if _, ok := conn.sessionUpdates[sessionID]; !ok {
		conn.sessionUpdates[sessionID] = NewSessionUpdates(sessionID)
	}
	conn.sessionUpdates[sessionID].addIssues(errors, issueScore)
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
	if err := conn.webGraphQL.Send(); err != nil {
		log.Printf("webGraphQL bulk send err: %s", err)
	}
	if err := conn.webErrors.Send(); err != nil {
		log.Printf("webErrors bulk send err: %s", err)
	}
	if err := conn.webErrorEvents.Send(); err != nil {
		log.Printf("webErrorEvents bulk send err: %s", err)
	}
	if err := conn.webErrorTags.Send(); err != nil {
		log.Printf("webErrorTags bulk send err: %s", err)
	}
	if err := conn.webIssues.Send(); err != nil {
		log.Printf("webIssues bulk send err: %s", err)
	}
	if err := conn.webIssueEvents.Send(); err != nil {
		log.Printf("webIssueEvents bulk send err: %s", err)
	}
	if err := conn.webCustomEvents.Send(); err != nil {
		log.Printf("webCustomEvents bulk send err: %s", err)
	}
	if err := conn.webClickEvents.Send(); err != nil {
		log.Printf("webClickEvents bulk send err: %s", err)
	}
	if err := conn.webNetworkRequest.Send(); err != nil {
		log.Printf("webNetworkRequest bulk send err: %s", err)
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
