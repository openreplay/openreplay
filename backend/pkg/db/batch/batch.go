package batch

import (
	"context"
	"github.com/jackc/pgx/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"log"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/monitoring"
	"strings"
	"time"
)

type Batches interface {
	Queue(sessionID uint64, sql string, args ...interface{})
	UpdateSize(sessionID uint64, reqSize int)
	UpdateSessionEvents(sessionID uint64, events, pages int)
	Commit()
}

type batchItem struct {
	query     string
	arguments []interface{}
}

type batchImpl struct {
	db              postgres.Pool
	batches         map[uint64]*pgx.Batch
	batchSizes      map[uint64]int
	rawBatches      map[uint64][]*batchItem
	batchQueueLimit int
	batchSizeLimit  int
	// updates (common) -> commit method
	sessionUpdates map[uint64]*sessionUpdates
	// metrics (common)
	batchSizeBytes    syncfloat64.Histogram
	batchSizeLines    syncfloat64.Histogram
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
}

func New(db postgres.Pool, queueLimit, sizeLimit int, metrics *monitoring.Metrics) Batches {
	b := &batchImpl{
		db:              db,
		batches:         make(map[uint64]*pgx.Batch),
		batchSizes:      make(map[uint64]int),
		rawBatches:      make(map[uint64][]*batchItem),
		batchQueueLimit: queueLimit,
		batchSizeLimit:  sizeLimit,
		sessionUpdates:  make(map[uint64]*sessionUpdates),
	}
	b.initMetrics(metrics)
	return b
}

func (b *batchImpl) initMetrics(metrics *monitoring.Metrics) {
	var err error
	b.batchSizeBytes, err = metrics.RegisterHistogram("batch_size_bytes")
	if err != nil {
		log.Printf("can't create batchSizeBytes metric: %s", err)
	}
	b.batchSizeLines, err = metrics.RegisterHistogram("batch_size_lines")
	if err != nil {
		log.Printf("can't create batchSizeLines metric: %s", err)
	}
	b.sqlRequestTime, err = metrics.RegisterHistogram("sql_request_time")
	if err != nil {
		log.Printf("can't create sqlRequestTime metric: %s", err)
	}
	b.sqlRequestCounter, err = metrics.RegisterCounter("sql_request_number")
	if err != nil {
		log.Printf("can't create sqlRequestNumber metric: %s", err)
	}
}

func (b *batchImpl) Queue(sessionID uint64, sql string, args ...interface{}) {
	batch, ok := b.batches[sessionID]
	if !ok {
		b.batches[sessionID] = &pgx.Batch{}
		b.rawBatches[sessionID] = make([]*batchItem, 0)
		batch = b.batches[sessionID]
	}
	batch.Queue(sql, args...)
	b.rawBatch(sessionID, sql, args...)
}

func (b *batchImpl) rawBatch(sessionID uint64, sql string, args ...interface{}) {
	// Temp raw batch store
	raw := b.rawBatches[sessionID]
	raw = append(raw, &batchItem{
		query:     sql,
		arguments: args,
	})
	b.rawBatches[sessionID] = raw
}

func (b *batchImpl) UpdateSize(sessionID uint64, reqSize int) {
	b.batchSizes[sessionID] += reqSize
	if b.batchSizes[sessionID] >= b.batchSizeLimit || b.batches[sessionID].Len() >= b.batchQueueLimit {
		b.commitBatch(sessionID)
	}
}

func (b *batchImpl) UpdateSessionEvents(sessionID uint64, events, pages int) {
	if _, ok := b.sessionUpdates[sessionID]; !ok {
		b.sessionUpdates[sessionID] = NewSessionUpdates(sessionID)
	}
	b.sessionUpdates[sessionID].add(pages, events)
}

func (b *batchImpl) Commit() {
	for sessID, batch := range b.batches {
		// Append session update sql request to the end of batch
		if update, ok := b.sessionUpdates[sessID]; ok {
			sql, args := update.request()
			if sql != "" {
				b.Queue(sessID, sql, args...)
				batch, _ = b.batches[sessID]
			}
		}
		// Record batch size in bytes and number of lines
		b.batchSizeBytes.Record(context.Background(), float64(b.batchSizes[sessID]))
		b.batchSizeLines.Record(context.Background(), float64(batch.Len()))

		start := time.Now()
		isFailed := false

		// Send batch to db and execute
		br := b.db.SendBatch(batch)
		l := batch.Len()
		for i := 0; i < l; i++ {
			if ct, err := br.Exec(); err != nil {
				log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessID, err)
				failedSql := b.rawBatches[sessID][i]
				query := strings.ReplaceAll(failedSql.query, "\n", " ")
				log.Println("failed sql req:", query, failedSql.arguments)
				isFailed = true
			}
		}
		br.Close() // returns err
		b.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
		b.sqlRequestCounter.Add(context.Background(), 1,
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
		if !isFailed {
			delete(b.sessionUpdates, sessID)
		}
	}
	b.batches = make(map[uint64]*pgx.Batch)
	b.batchSizes = make(map[uint64]int)
	b.rawBatches = make(map[uint64][]*batchItem)

	// Session updates
	for sessID, su := range b.sessionUpdates {
		sql, args := su.request()
		if sql == "" {
			continue
		}
		if err := b.db.Exec(sql, args...); err != nil {
			log.Printf("failed session update, sessID: %d, err: %s", sessID, err)
		}
	}
	b.sessionUpdates = make(map[uint64]*sessionUpdates)
}

func (b *batchImpl) commitBatch(sessionID uint64) {
	batch, ok := b.batches[sessionID]
	if !ok {
		log.Printf("can't find batch for session: %d", sessionID)
		return
	}
	// Append session update sql request to the end of batch
	if update, ok := b.sessionUpdates[sessionID]; ok {
		sql, args := update.request()
		if sql != "" {
			b.Queue(sessionID, sql, args...)
			batch, _ = b.batches[sessionID]
		}
	}
	// Record batch size in bytes and number of lines
	b.batchSizeBytes.Record(context.Background(), float64(b.batchSizes[sessionID]))
	b.batchSizeLines.Record(context.Background(), float64(batch.Len()))

	start := time.Now()
	isFailed := false

	// Send batch to db and execute
	br := b.db.SendBatch(batch)
	l := batch.Len()
	for i := 0; i < l; i++ {
		if ct, err := br.Exec(); err != nil {
			log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessionID, err)
			failedSql := b.rawBatches[sessionID][i]
			query := strings.ReplaceAll(failedSql.query, "\n", " ")
			log.Println("failed sql req:", query, failedSql.arguments)
			isFailed = true
		}
	}
	br.Close()

	b.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
	b.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "batch"), attribute.Bool("failed", isFailed))

	// Clean batch info
	delete(b.batches, sessionID)
	delete(b.batchSizes, sessionID)
	delete(b.rawBatches, sessionID)
	delete(b.sessionUpdates, sessionID)
}
