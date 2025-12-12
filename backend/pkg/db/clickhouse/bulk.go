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
	Send() error
}

type bulkImpl struct {
	conn    driver.Conn
	metrics database.Database
	table   string
	query   string
	counter int
	values  [][]interface{}
}

func NewBulk(conn driver.Conn, metrics database.Database, table, query string) (Bulk, error) {
	switch {
	case conn == nil:
		return nil, errors.New("clickhouse connection is empty")
	case table == "":
		return nil, errors.New("table is empty")
	case query == "":
		return nil, errors.New("query is empty")
	}
	return &bulkImpl{
		conn:    conn,
		metrics: metrics,
		table:   table,
		query:   query,
		values:  make([][]interface{}, 0),
	}, nil
}

func (b *bulkImpl) Append(args ...interface{}) error {
	b.values = append(b.values, args)
	b.counter++
	return nil
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
	for _, set := range b.values {
		if err := batch.Append(set...); err != nil {
			log.Printf("can't append value set to batch, err: %s", err)
			log.Printf("failed query: %s", b.query)
		}
	}
	err = batch.Send()
	log.Printf("[!] batch name: %s, rows: %d, duration: %d ms", b.table, b.counter, time.Now().Sub(start).Milliseconds())
	// Save bulk metrics
	if b.metrics != nil {
		b.metrics.RecordBulkElements(float64(len(b.values)), "ch", b.table)
		b.metrics.RecordBulkInsertDuration(float64(time.Now().Sub(start).Milliseconds()), "ch", b.table)
	}
	// Prepare values slice for a new data
	b.values = make([][]interface{}, 0)
	return err
}
