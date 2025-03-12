package pool

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
	"openreplay/backend/pkg/metrics/database"
)

// Pool is a pgx.Pool wrapper with metrics integration
type Pool interface {
	Query(sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(sql string, args ...interface{}) pgx.Row
	Exec(sql string, arguments ...interface{}) error
	SendBatch(b *pgx.Batch) pgx.BatchResults
	Begin() (*Tx, error)
	Close()
}

type poolImpl struct {
	url     string
	conn    *pgxpool.Pool
	metrics database.Database
}

func New(metrics database.Database, url string) (Pool, error) {
	if url == "" {
		return nil, errors.New("pg connection url is empty")
	}
	conn, err := pgxpool.Connect(context.Background(), url)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.Connect error: %v", err)
	}
	res := &poolImpl{
		url:     url,
		conn:    conn,
		metrics: metrics,
	}
	return res, nil
}

func (p *poolImpl) Query(sql string, args ...interface{}) (pgx.Rows, error) {
	start := time.Now()
	res, err := p.conn.Query(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	p.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	p.metrics.IncreaseTotalRequests(method, table)
	return res, err
}

func (p *poolImpl) QueryRow(sql string, args ...interface{}) pgx.Row {
	start := time.Now()
	res := p.conn.QueryRow(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	p.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	p.metrics.IncreaseTotalRequests(method, table)
	return res
}

func (p *poolImpl) Exec(sql string, arguments ...interface{}) error {
	start := time.Now()
	_, err := p.conn.Exec(getTimeoutContext(), sql, arguments...)
	method, table := methodName(sql)
	p.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	p.metrics.IncreaseTotalRequests(method, table)
	return err
}

func (p *poolImpl) SendBatch(b *pgx.Batch) pgx.BatchResults {
	start := time.Now()
	res := p.conn.SendBatch(getTimeoutContext(), b)
	p.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "sendBatch", "")
	p.metrics.IncreaseTotalRequests("sendBatch", "")
	return res
}

func (p *poolImpl) Begin() (*Tx, error) {
	start := time.Now()
	tx, err := p.conn.Begin(context.Background())
	p.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "begin", "")
	p.metrics.IncreaseTotalRequests("begin", "")
	return &Tx{tx, p.metrics}, err
}

func (p *poolImpl) Close() {
	p.conn.Close()
}

// TX - start

type Tx struct {
	pgx.Tx
	metrics database.Database
}

func (tx *Tx) TxExec(sql string, args ...interface{}) error {
	start := time.Now()
	_, err := tx.Exec(context.Background(), sql, args...)
	method, table := methodName(sql)
	tx.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	tx.metrics.IncreaseTotalRequests(method, table)
	return err
}

func (tx *Tx) TxQueryRow(sql string, args ...interface{}) pgx.Row {
	start := time.Now()
	res := tx.QueryRow(context.Background(), sql, args...)
	method, table := methodName(sql)
	tx.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	tx.metrics.IncreaseTotalRequests(method, table)
	return res
}

func (tx *Tx) TxRollback() error {
	start := time.Now()
	err := tx.Rollback(context.Background())
	tx.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "rollback", "")
	tx.metrics.IncreaseTotalRequests("rollback", "")
	return err
}

func (tx *Tx) TxCommit() error {
	start := time.Now()
	err := tx.Commit(context.Background())
	tx.metrics.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "commit", "")
	tx.metrics.IncreaseTotalRequests("commit", "")
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
		tableNameParts := strings.Split(strings.TrimSpace(parts[2]), "(")
		table = tableNameParts[0]
	}
	return cmd, table
}
