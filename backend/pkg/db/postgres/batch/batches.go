package batch

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/metrics/database"
)

type batchItem struct {
	query     string
	arguments []interface{}
}

type SessionBatch struct {
	Batch *pgx.Batch
	items []*batchItem
}

func NewSessionBatch() *SessionBatch {
	return &SessionBatch{
		Batch: &pgx.Batch{},
		items: make([]*batchItem, 0),
	}
}

func (b *SessionBatch) Queue(query string, arguments ...interface{}) {
	b.Batch.Queue(query, arguments...)
	b.items = append(b.items, &batchItem{
		query:     query,
		arguments: arguments,
	})
}

func (b *SessionBatch) Len() int {
	return b.Batch.Len()
}

type batchesTask struct {
	batches []*SessionBatch
}

func NewBatchesTask(size int) *batchesTask {
	return &batchesTask{batches: make([]*SessionBatch, 0, size)}
}

type BatchSet struct {
	log        logger.Logger
	c          pool.Pool
	metrics    database.Database
	ctx        context.Context
	batches    map[uint64]*SessionBatch
	workerTask chan *batchesTask
	done       chan struct{}
	finished   chan struct{}
}

func NewBatchSet(log logger.Logger, c pool.Pool, metrics database.Database) *BatchSet {
	bs := &BatchSet{
		log:        log,
		c:          c,
		metrics:    metrics,
		ctx:        context.Background(),
		batches:    make(map[uint64]*SessionBatch),
		workerTask: make(chan *batchesTask, 1),
		done:       make(chan struct{}),
		finished:   make(chan struct{}),
	}
	go bs.worker()
	return bs
}

func (conn *BatchSet) getBatch(sessionID uint64) *SessionBatch {
	sessionID = sessionID % 10
	if _, ok := conn.batches[sessionID]; !ok {
		conn.batches[sessionID] = NewSessionBatch()
	}
	return conn.batches[sessionID]
}

func (conn *BatchSet) BatchQueue(sessionID uint64, sql string, args ...interface{}) {
	conn.getBatch(sessionID).Queue(sql, args...)
}

func (conn *BatchSet) Commit() {
	newTask := NewBatchesTask(len(conn.batches) + 2)
	// Copy batches
	for _, b := range conn.batches {
		newTask.batches = append(newTask.batches, b)
	}
	// Reset current batches
	conn.batches = make(map[uint64]*SessionBatch)
	conn.workerTask <- newTask
}

func (conn *BatchSet) Stop() {
	conn.done <- struct{}{}
	<-conn.finished
}

func (conn *BatchSet) sendBatches(t *batchesTask) {
	for _, batch := range t.batches {
		// Record batch size
		conn.metrics.RecordBatchElements(float64(batch.Len()))

		start := time.Now()

		// Send batch to db and execute
		br := conn.c.SendBatch(batch.Batch)
		l := batch.Len()
		for i := 0; i < l; i++ {
			if _, err := br.Exec(); err != nil {
				conn.log.Error(conn.ctx, "Error in PG batch: %v", err)
				failedSql := batch.items[i]
				query := strings.ReplaceAll(failedSql.query, "\n", " ")
				conn.log.Error(conn.ctx, "failed sql req: %s", query)
			}
		}
		br.Close() // returns err
		conn.metrics.RecordBatchInsertDuration(float64(time.Now().Sub(start).Milliseconds()))
	}
}

func (conn *BatchSet) worker() {
	for {
		select {
		case t := <-conn.workerTask:
			conn.sendBatches(t)
		case <-conn.done:
			if len(conn.workerTask) > 0 {
				for t := range conn.workerTask {
					conn.sendBatches(t)
				}
			}
			conn.finished <- struct{}{}
			return
		}
	}
}
