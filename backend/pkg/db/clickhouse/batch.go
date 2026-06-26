package clickhouse

import (
	"context"
	"errors"
	"fmt"
	"log"
	"openreplay/backend/pkg/logger"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/metrics/database"
)

type Batch interface {
	Append(args ...interface{}) error
	Len() int
	Table() string
	MarkFlushed()
	Send() error
}

type batchImpl struct {
	log           logger.Logger
	conn          driver.Conn
	metrics       database.Database
	table         string
	query         string
	counter       int
	bytes         int
	firstAppendAt time.Time
	lastAppendAt  time.Time
	flushedAt     time.Time
	values        [][]interface{}
	sizeLimit     int
}

func (b *batchImpl) isWebEvents() bool {
	return b.table == "web_events"
}

func NewBatch(log logger.Logger, conn driver.Conn, metrics database.Database, table, query string, sizeLimit int) (Batch, error) {
	switch {
	case conn == nil:
		return nil, errors.New("clickhouse connection is empty")
	case table == "":
		return nil, errors.New("table is empty")
	case query == "":
		return nil, errors.New("query is empty")
	}
	return &batchImpl{
		log:       log,
		conn:      conn,
		metrics:   metrics,
		table:     table,
		query:     query,
		values:    make([][]interface{}, 0),
		sizeLimit: sizeLimit,
	}, nil
}

const webEventsFixedRowBytes = 30

func (b *batchImpl) Append(args ...interface{}) error {
	b.values = append(b.values, args)
	b.counter++
	if b.isWebEvents() {
		now := time.Now()
		if b.counter == 1 {
			b.firstAppendAt = now
		}
		b.lastAppendAt = now
		b.bytes += webEventsFixedRowBytes
		for _, v := range args {
			b.bytes += argLen(v)
		}
	}
	return nil
}

func (b *batchImpl) Len() int {
	return b.counter
}

func (b *batchImpl) Table() string {
	return b.table
}

func (b *batchImpl) MarkFlushed() {
	b.flushedAt = time.Now()
}

func (b *batchImpl) Send() error {
	if len(b.values) == 0 {
		return nil
	}
	start := time.Now()
	batch, err := b.conn.PrepareBatch(context.Background(), b.query)
	if err != nil {
		return fmt.Errorf("can't create new batch: %s", err)
	}
	afterPrepare := time.Now()
	for _, set := range b.values {
		if err := batch.Append(set...); err != nil {
			log.Printf("can't append value set to batch, err: %s", err)
			log.Printf("failed query: %s", b.query)
		}
	}
	afterAppend := time.Now()
	if err := batch.Send(); err != nil {
		return err
	}
	afterSend := time.Now()

	if b.isWebEvents() {
		totalMb := float64(b.bytes) / (1024 * 1024)
		b.log.Debug(context.Background(), "[CH] table=%s rows=%d totalMb=%.3f fillMs=%d idleMs=%d queueMs=%d prepareMs=%d appendMs=%d sendMs=%d totalMs=%d",
			b.table, b.counter, totalMb,
			b.lastAppendAt.Sub(b.firstAppendAt).Milliseconds(),
			b.flushedAt.Sub(b.lastAppendAt).Milliseconds(),
			start.Sub(b.flushedAt).Milliseconds(),
			afterPrepare.Sub(start).Milliseconds(),
			afterAppend.Sub(afterPrepare).Milliseconds(),
			afterSend.Sub(afterAppend).Milliseconds(),
			afterSend.Sub(start).Milliseconds(),
		)
	}

	// Save bulk metrics
	if b.metrics != nil {
		b.metrics.RecordBulkElements(float64(len(b.values)), "ch", b.table)
		b.metrics.RecordBulkInsertDuration(float64(afterSend.Sub(start).Milliseconds()), "ch", b.table)
	}
	// Prepare values slice for a new data
	b.values = make([][]interface{}, 0)
	b.counter = 0
	b.bytes = 0
	return nil
}

func argLen(v interface{}) int {
	switch x := v.(type) {
	case string:
		return len(x)
	case []byte:
		return len(x)
	default:
		return 0
	}
}
