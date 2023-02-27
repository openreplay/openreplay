package clickhouse

import (
	"context"
	"errors"
	"fmt"
	"log"
	"openreplay/backend/pkg/metrics/database"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type Bulk interface {
	Append(args ...interface{}) error
	Send() error
}

type bulkImpl struct {
	conn   driver.Conn
	table  string
	query  string
	values [][]interface{}
}

func NewBulk(conn driver.Conn, table, query string) (Bulk, error) {
	switch {
	case conn == nil:
		return nil, errors.New("clickhouse connection is empty")
	case table == "":
		return nil, errors.New("table is empty")
	case query == "":
		return nil, errors.New("query is empty")
	}
	return &bulkImpl{
		conn:   conn,
		table:  table,
		query:  query,
		values: make([][]interface{}, 0),
	}, nil
}

func (b *bulkImpl) Append(args ...interface{}) error {
	b.values = append(b.values, args)
	return nil
}

func (b *bulkImpl) Send() error {
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
	// Save bulk metrics
	database.RecordBulkElements(float64(len(b.values)), "ch", b.table)
	database.RecordBulkInsertDuration(float64(time.Now().Sub(start).Milliseconds()), "ch", b.table)
	// Prepare values slice for a new data
	b.values = make([][]interface{}, 0)
	return err
}
