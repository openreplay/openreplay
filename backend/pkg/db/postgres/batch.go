package postgres

import (
	"context"
	"github.com/jackc/pgx/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	"openreplay/backend/pkg/monitoring"
	"strings"
	"time"
)

type batchItem struct {
	query     string
	arguments []interface{}
}

type BatchSet struct {
	c                 Pool
	batches           map[uint64]*pgx.Batch
	batchSizes        map[uint64]int
	rawBatches        map[uint64][]*batchItem
	sessionUpdates    map[uint64]*sessionUpdates
	batchQueueLimit   int
	batchSizeLimit    int
	batchSizeBytes    syncfloat64.Histogram
	batchSizeLines    syncfloat64.Histogram
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
}

func NewBatchSet(c Pool, queueLimit, sizeLimit int, metrics *monitoring.Metrics) *BatchSet {
	bs := &BatchSet{
		c:               c,
		batches:         make(map[uint64]*pgx.Batch),
		batchSizes:      make(map[uint64]int),
		rawBatches:      make(map[uint64][]*batchItem),
		sessionUpdates:  make(map[uint64]*sessionUpdates),
		batchQueueLimit: queueLimit,
		batchSizeLimit:  sizeLimit,
	}
	bs.initMetrics(metrics)
	return bs
}

func (conn *BatchSet) initMetrics(metrics *monitoring.Metrics) {
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

func (conn *BatchSet) batchQueue(sessionID uint64, sql string, args ...interface{}) {
	batch, ok := conn.batches[sessionID]
	if !ok {
		conn.batches[sessionID] = &pgx.Batch{}
		conn.rawBatches[sessionID] = make([]*batchItem, 0)
		batch = conn.batches[sessionID]
	}
	batch.Queue(sql, args...)
	conn.rawBatch(sessionID, sql, args...)
}

func (conn *BatchSet) rawBatch(sessionID uint64, sql string, args ...interface{}) {
	// Temp raw batch store
	raw := conn.rawBatches[sessionID]
	raw = append(raw, &batchItem{
		query:     sql,
		arguments: args,
	})
	conn.rawBatches[sessionID] = raw
}

func (conn *BatchSet) updateSessionEvents(sessionID uint64, events, pages int) {
	if _, ok := conn.sessionUpdates[sessionID]; !ok {
		conn.sessionUpdates[sessionID] = NewSessionUpdates(sessionID)
	}
	conn.sessionUpdates[sessionID].add(pages, events)
}

func (conn *BatchSet) Commit() {
	// Copy batches
	batches := conn.batches
	batchSizes := conn.batchSizes
	rawBatches := conn.rawBatches
	sessionsUpdates := conn.sessionUpdates

	// Reset current batches
	conn.batches = make(map[uint64]*pgx.Batch)
	conn.batchSizes = make(map[uint64]int)
	conn.rawBatches = make(map[uint64][]*batchItem)
	conn.sessionUpdates = make(map[uint64]*sessionUpdates)

	// Async insert
	go func() {
		start := time.Now()
		for sessID, b := range batches {
			// Append session update sql request to the end of batch
			if update, ok := sessionsUpdates[sessID]; ok {
				sql, args := update.request()
				if sql != "" {
					b.Queue(sql, args...)
					r := rawBatches[sessID]
					r = append(r, &batchItem{
						query:     sql,
						arguments: args,
					})
					rawBatches[sessID] = r
					b, _ = batches[sessID]
				}
			}
			// Record batch size in bytes and number of lines
			conn.batchSizeBytes.Record(context.Background(), float64(batchSizes[sessID]))
			conn.batchSizeLines.Record(context.Background(), float64(b.Len()))

			start := time.Now()
			isFailed := false

			// Send batch to db and execute
			br := conn.c.SendBatch(b)
			l := b.Len()
			for i := 0; i < l; i++ {
				if ct, err := br.Exec(); err != nil {
					log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessID, err)
					failedSql := rawBatches[sessID][i]
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
				delete(sessionsUpdates, sessID)
			}
		}

		// Session updates
		for sessID, su := range sessionsUpdates {
			sql, args := su.request()
			if sql == "" {
				continue
			}
			if err := conn.c.Exec(sql, args...); err != nil {
				log.Printf("failed session update, sessID: %d, err: %s", sessID, err)
			}
		}
		log.Printf("batches insert duration(ms): %d", time.Now().Sub(start).Milliseconds())
	}()
}

func (conn *BatchSet) updateBatchSize(sessionID uint64, reqSize int) {
	conn.batchSizes[sessionID] += reqSize
	if conn.batchSizes[sessionID] >= conn.batchSizeLimit || conn.batches[sessionID].Len() >= conn.batchQueueLimit {
		conn.commitBatch(sessionID)
	}
}

func (conn *BatchSet) commitBatch(sessionID uint64) {
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
