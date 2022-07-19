package postgres

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"strings"
	"time"
)

// Pool is a pgx.Pool wrapper with metrics integration
type Pool interface {
	Query(sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(sql string, args ...interface{}) pgx.Row
	Exec(sql string, arguments ...interface{}) error
	SendBatch(b *pgx.Batch) pgx.BatchResults
	Begin() (*_Tx, error)
	Close()
}

type poolImpl struct {
	conn              *pgxpool.Pool
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
}

func (p *poolImpl) Query(sql string, args ...interface{}) (pgx.Rows, error) {
	start := time.Now()
	res, err := p.conn.Query(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	p.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	p.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return res, err
}

func (p *poolImpl) QueryRow(sql string, args ...interface{}) pgx.Row {
	start := time.Now()
	res := p.conn.QueryRow(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	p.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	p.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return res
}

func (p *poolImpl) Exec(sql string, arguments ...interface{}) error {
	start := time.Now()
	_, err := p.conn.Exec(getTimeoutContext(), sql, arguments...)
	method, table := methodName(sql)
	p.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	p.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return err
}

func (p *poolImpl) SendBatch(b *pgx.Batch) pgx.BatchResults {
	start := time.Now()
	res := p.conn.SendBatch(getTimeoutContext(), b)
	p.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "sendBatch"))
	p.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "sendBatch"))
	return res
}

func (p *poolImpl) Begin() (*_Tx, error) {
	start := time.Now()
	tx, err := p.conn.Begin(context.Background())
	p.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "begin"))
	p.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "begin"))
	return &_Tx{tx, p.sqlRequestTime, p.sqlRequestCounter}, err
}

func (p *poolImpl) Close() {
	p.conn.Close()
}

func NewPool(conn *pgxpool.Pool, sqlRequestTime syncfloat64.Histogram, sqlRequestCounter syncfloat64.Counter) (Pool, error) {
	if conn == nil {
		return nil, errors.New("conn is empty")
	}
	return &poolImpl{
		conn:              conn,
		sqlRequestTime:    sqlRequestTime,
		sqlRequestCounter: sqlRequestCounter,
	}, nil
}

// TX - start

type _Tx struct {
	pgx.Tx
	sqlRequestTime    syncfloat64.Histogram
	sqlRequestCounter syncfloat64.Counter
}

func (tx *_Tx) exec(sql string, args ...interface{}) error {
	start := time.Now()
	_, err := tx.Exec(context.Background(), sql, args...)
	method, table := methodName(sql)
	tx.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", method), attribute.String("table", table))
	tx.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", method), attribute.String("table", table))
	return err
}

func (tx *_Tx) rollback() error {
	start := time.Now()
	err := tx.Rollback(context.Background())
	tx.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "rollback"))
	tx.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "rollback"))
	return err
}

func (tx *_Tx) commit() error {
	start := time.Now()
	err := tx.Commit(context.Background())
	tx.sqlRequestTime.Record(context.Background(), float64(time.Now().Sub(start).Milliseconds()),
		attribute.String("method", "commit"))
	tx.sqlRequestCounter.Add(context.Background(), 1,
		attribute.String("method", "commit"))
	return err
}

// TX - end

func getTimeoutContext() context.Context {
	ctx, _ := context.WithTimeout(context.Background(), time.Second*30)
	return ctx
}

func methodName(sql string) (string, string) {
	cmd, table := "unknown", "unknown"

	// Prepare sql request for parsing
	sql = strings.TrimSpace(sql)
	sql = strings.ReplaceAll(sql, "\n", " ")
	sql = strings.ReplaceAll(sql, "\t", "")
	sql = strings.ToLower(sql)

	// Get sql command name
	parts := strings.Split(sql, " ")
	if parts[0] == "" {
		return cmd, table
	} else {
		cmd = strings.TrimSpace(parts[0])
	}

	// Get table name
	switch cmd {
	case "select":
		for i, p := range parts {
			if strings.TrimSpace(p) == "from" {
				table = strings.TrimSpace(parts[i+1])
			}
		}
	case "update":
		table = strings.TrimSpace(parts[1])
	case "insert":
		table = strings.TrimSpace(parts[2])
	}
	return cmd, table
}
