package clickhouse

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/metrics/database"
)

type Bulk interface {
	Append(args ...interface{}) error
	Len() int
	Send() error
}

type bulkImpl struct {
	conn          driver.Conn
	metrics       database.Database
	table         string
	query         string
	counter       int
	bytes         int
	firstAppendAt time.Time
	lastAppendAt  time.Time
	values        [][]interface{}
	sizeLimit     int
}

func (b *bulkImpl) isWebEvents() bool {
	return b.table == "web_events"
}

func NewBulk(conn driver.Conn, metrics database.Database, table, query string, sizeLimit int) (Bulk, error) {
	switch {
	case conn == nil:
		return nil, errors.New("clickhouse connection is empty")
	case table == "":
		return nil, errors.New("table is empty")
	case query == "":
		return nil, errors.New("query is empty")
	}
	return &bulkImpl{
		conn:      conn,
		metrics:   metrics,
		table:     table,
		query:     query,
		values:    make([][]interface{}, 0),
		sizeLimit: sizeLimit,
	}, nil
}

const webEventsFixedRowBytes = 30

func (b *bulkImpl) Append(args ...interface{}) error {
	b.values = append(b.values, args)
	b.counter++
	if b.isWebEvents() {
		now := time.Now()
		if b.counter == 0 {
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

func (b *bulkImpl) Len() int {
	return b.counter
}

func (b *bulkImpl) Send() error {
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
		log.Printf("[CH] table=%s rows=%d totalMb=%.2f fillMs=%d queueMs=%d prepareMs=%d appendMs=%d sendMs=%d totalMs=%d",
			b.table, b.counter, totalMb,
			b.lastAppendAt.Sub(b.firstAppendAt).Milliseconds(),
			start.Sub(b.lastAppendAt).Milliseconds(),
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
