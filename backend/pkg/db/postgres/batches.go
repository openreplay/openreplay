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

type SessionBatch struct {
	sessID  uint64
	batch   *pgx.Batch
	size    int
	items   []*batchItem
	updates *sessionUpdates
}

func NewSessionBatch(sessionID uint64) *SessionBatch {
	return &SessionBatch{
		sessID:  sessionID,
		batch:   &pgx.Batch{},
		size:    0,
		items:   make([]*batchItem, 0),
		updates: NewSessionUpdates(sessionID),
	}
}

func (b *SessionBatch) SessionID() uint64 {
	return b.sessID
}

func (b *SessionBatch) Queue(query string, arguments ...interface{}) {
	b.batch.Queue(query, arguments...)
	b.items = append(b.items, &batchItem{
		query:     query,
		arguments: arguments,
	})
}

func (b *SessionBatch) Update(pages, events int) {
	b.updates.addEvents(pages, events)
}

func (b *SessionBatch) AddToSize(size int) {
	b.size += size
}

func (b *SessionBatch) Size() int {
	return b.size
}

func (b *SessionBatch) Len() int {
	return b.batch.Len()
}

func (b *SessionBatch) Prepare() {
	sql, args := b.updates.request()
	if sql != "" {
		b.Queue(sql, args...)
	}
}

type batchesTask struct {
	batches []*SessionBatch
}

func NewBatchesTask(size int) *batchesTask {
	return &batchesTask{batches: make([]*SessionBatch, 0, size)}
}

type BatchSet struct {
	c                 Pool
	batches           map[uint64]*SessionBatch
	batchQueueLimit   int
	batchSizeLimit    int
	batchSizeBytes    syncfloat64.Histogram
	batchSizeLines    syncfloat64.Histogram
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
	updates           map[uint64]*sessionUpdates
	workerTask        chan *batchesTask
	done              chan struct{}
	finished          chan struct{}
}

func NewBatchSet(c Pool, queueLimit, sizeLimit int, metrics *monitoring.Metrics) *BatchSet {
	bs := &BatchSet{
		c:               c,
		batches:         make(map[uint64]*SessionBatch),
		batchQueueLimit: queueLimit,
		batchSizeLimit:  sizeLimit,
		workerTask:      make(chan *batchesTask, 1),
		done:            make(chan struct{}),
		finished:        make(chan struct{}),
		updates:         make(map[uint64]*sessionUpdates),
	}
	bs.initMetrics(metrics)
	go bs.worker()
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

func (conn *BatchSet) getBatch(sessionID uint64) *SessionBatch {
	sessionID = sessionID % 10
	if _, ok := conn.batches[sessionID]; !ok {
		conn.batches[sessionID] = NewSessionBatch(sessionID)
	}
	return conn.batches[sessionID]
}

func (conn *BatchSet) batchQueue(sessionID uint64, sql string, args ...interface{}) {
	conn.getBatch(sessionID).Queue(sql, args...)
}

func (conn *BatchSet) updateSessionEvents(sessionID uint64, events, pages int) {
	upd, ok := conn.updates[sessionID]
	if !ok {
		upd = NewSessionUpdates(sessionID)
		conn.updates[sessionID] = upd
	}
	upd.addEvents(pages, events)
}

func (conn *BatchSet) updateSessionIssues(sessionID uint64, errors, issueScore int) {
	upd, ok := conn.updates[sessionID]
	if !ok {
		upd = NewSessionUpdates(sessionID)
		conn.updates[sessionID] = upd
	}
	upd.addIssues(errors, issueScore)
}

func (conn *BatchSet) updateBatchSize(sessionID uint64, reqSize int) {
	conn.getBatch(sessionID).AddToSize(reqSize)
}

func (conn *BatchSet) Commit() {
	newTask := NewBatchesTask(len(conn.batches) + 2)
	// Copy batches
	for _, b := range conn.batches {
		newTask.batches = append(newTask.batches, b)
	}
	// Reset current batches
	conn.batches = make(map[uint64]*SessionBatch)

	// test batch
	batch := NewSessionBatch(0)
	for _, upd := range conn.updates {
		if str, args := upd.request(); str != "" {
			batch.Queue(str, args...)
		}
	}
	log.Printf("size of updates batch: %d", batch.Len())
	newTask.batches = append(newTask.batches, batch)
	conn.updates = make(map[uint64]*sessionUpdates)

	conn.workerTask <- newTask
}

func (conn *BatchSet) Stop() {
	conn.done <- struct{}{}
	<-conn.finished
}

func (conn *BatchSet) sendBatches(t *batchesTask) {
	for _, batch := range t.batches {
		// Append session update sql request to the end of batch
		batch.Prepare()
		// Record batch size in bytes and number of lines
		conn.batchSizeBytes.Record(context.Background(), float64(batch.Size()))
		conn.batchSizeLines.Record(context.Background(), float64(batch.Len()))

		start := time.Now()
		isFailed := false

		// Send batch to db and execute
		br := conn.c.SendBatch(batch.batch)
		l := batch.Len()
		for i := 0; i < l; i++ {
			if _, err := br.Exec(); err != nil {
				log.Printf("Error in PG batch (session: %d): %v \n", batch.SessionID(), err)
				failedSql := batch.items[i]
				query := strings.ReplaceAll(failedSql.query, "\n", " ")
				log.Println("failed sql req:", query, failedSql.arguments)
				isFailed = true
			}
		}
		br.Close() // returns err
		dur := time.Now().Sub(start).Milliseconds()
		conn.sqlRequestTime.Record(context.Background(), float64(dur),
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
		conn.sqlRequestCounter.Add(context.Background(), 1,
			attribute.String("method", "batch"), attribute.Bool("failed", isFailed))
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
