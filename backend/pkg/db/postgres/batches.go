package postgres

import (
	"log"
	"strings"
	"time"

	"openreplay/backend/pkg/metrics/database"

	"github.com/jackc/pgx/v4"
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
	c               Pool
	batches         map[uint64]*SessionBatch
	batchQueueLimit int
	batchSizeLimit  int
	updates         map[uint64]*sessionUpdates
	workerTask      chan *batchesTask
	done            chan struct{}
	finished        chan struct{}
}

func NewBatchSet(c Pool, queueLimit, sizeLimit int) *BatchSet {
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
	go bs.worker()
	return bs
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

	// common batch for user's updates
	batch := NewSessionBatch(0)
	for _, upd := range conn.updates {
		if str, args := upd.request(); str != "" {
			batch.Queue(str, args...)
		}
	}
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
		database.RecordBatchSize(float64(batch.Size()))
		database.RecordBatchElements(float64(batch.Len()))

		start := time.Now()

		// Send batch to db and execute
		br := conn.c.SendBatch(batch.batch)
		l := batch.Len()
		for i := 0; i < l; i++ {
			if _, err := br.Exec(); err != nil {
				log.Printf("Error in PG batch (session: %d): %v \n", batch.SessionID(), err)
				failedSql := batch.items[i]
				query := strings.ReplaceAll(failedSql.query, "\n", " ")
				log.Println("failed sql req:", query, failedSql.arguments)
			}
		}
		br.Close() // returns err
		database.RecordBatchInsertDuration(float64(time.Now().Sub(start).Milliseconds()))
	}
}

func (conn *BatchSet) worker() {
	for {
		select {
		case t := <-conn.workerTask:
			start := time.Now()
			conn.sendBatches(t)
			log.Printf("pg batches dur: %d", time.Now().Sub(start).Milliseconds())
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
