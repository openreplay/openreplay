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
	conn      driver.Conn
	metrics   database.Database
	table     string
	query     string
	counter   int
	values    [][]interface{}
	sizeLimit int
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

func (b *bulkImpl) Append(args ...interface{}) error {
	b.values = append(b.values, args)
	b.counter++
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

	jsonRows, jsonBytes, totalBytes := b.payloadStats()
	log.Printf("[CH] table=%s rows=%d jsonRows=%d jsonBytes=%d totalBytes=%d prepareMs=%d appendMs=%d sendMs=%d totalMs=%d",
		b.table, b.counter, jsonRows, jsonBytes, totalBytes,
		afterPrepare.Sub(start).Milliseconds(),
		afterAppend.Sub(afterPrepare).Milliseconds(),
		afterSend.Sub(afterAppend).Milliseconds(),
		afterSend.Sub(start).Milliseconds(),
	)

	// Save bulk metrics
	if b.metrics != nil {
		b.metrics.RecordBulkElements(float64(len(b.values)), "ch", b.table)
		b.metrics.RecordBulkInsertDuration(float64(afterSend.Sub(start).Milliseconds()), "ch", b.table)
	}
	// Prepare values slice for a new data
	b.values = make([][]interface{}, 0)
	b.counter = 0
	return nil
}

var jsonColumns = map[string][]int{
	"web_events":    {25, 26}, // "$properties", properties
	"mobile_events": {12},     // "$properties"
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

func (b *bulkImpl) payloadStats() (jsonRows, jsonBytes, totalBytes int) {
	cols := jsonColumns[b.table]
	for _, row := range b.values {
		for _, v := range row {
			totalBytes += argLen(v)
		}
		rowJSON := 0
		for _, idx := range cols {
			if idx < len(row) {
				rowJSON += argLen(row[idx])
			}
		}
		jsonBytes += rowJSON
		if rowJSON > 4 { // more than "{}"
			jsonRows++
		}
	}
	return
}
