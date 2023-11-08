package pool

import (
	"context"
	"errors"
	"fmt"
	"log"
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
	Begin() (*_Tx, error)
	IsConnected() bool
	Close()
}

type poolImpl struct {
	url  string
	conn *pgxpool.Pool
}

func (p *poolImpl) IsConnected() bool {
	stat := p.conn.Stat()
	log.Println("stat: ", stat.AcquireCount(), stat.IdleConns(), stat.MaxConns(), stat.TotalConns())
	return true
}

func (p *poolImpl) Query(sql string, args ...interface{}) (pgx.Rows, error) {
	start := time.Now()
	res, err := p.conn.Query(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	database.IncreaseTotalRequests(method, table)
	return res, err
}

func (p *poolImpl) QueryRow(sql string, args ...interface{}) pgx.Row {
	start := time.Now()
	res := p.conn.QueryRow(getTimeoutContext(), sql, args...)
	method, table := methodName(sql)
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	database.IncreaseTotalRequests(method, table)
	return res
}

func (p *poolImpl) Exec(sql string, arguments ...interface{}) error {
	start := time.Now()
	_, err := p.conn.Exec(getTimeoutContext(), sql, arguments...)
	method, table := methodName(sql)
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	database.IncreaseTotalRequests(method, table)
	return err
}

func (p *poolImpl) SendBatch(b *pgx.Batch) pgx.BatchResults {
	start := time.Now()
	res := p.conn.SendBatch(getTimeoutContext(), b)
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "sendBatch", "")
	database.IncreaseTotalRequests("sendBatch", "")
	return res
}

func (p *poolImpl) Begin() (*_Tx, error) {
	start := time.Now()
	tx, err := p.conn.Begin(context.Background())
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "begin", "")
	database.IncreaseTotalRequests("begin", "")
	return &_Tx{tx}, err
}

func (p *poolImpl) Close() {
	p.conn.Close()
}

func New(url string) (Pool, error) {
	if url == "" {
		return nil, errors.New("pg connection url is empty")
	}
	conn, err := pgxpool.Connect(context.Background(), url)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.Connect error: %v", err)
	}
	res := &poolImpl{
		url:  url,
		conn: conn,
	}
	return res, nil
}

// TX - start

type _Tx struct {
	pgx.Tx
}

func (tx *_Tx) exec(sql string, args ...interface{}) error {
	start := time.Now()
	_, err := tx.Exec(context.Background(), sql, args...)
	method, table := methodName(sql)
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), method, table)
	database.IncreaseTotalRequests(method, table)
	return err
}

func (tx *_Tx) rollback() error {
	start := time.Now()
	err := tx.Rollback(context.Background())
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "rollback", "")
	database.IncreaseTotalRequests("rollback", "")
	return err
}

func (tx *_Tx) commit() error {
	start := time.Now()
	err := tx.Commit(context.Background())
	database.RecordRequestDuration(float64(time.Now().Sub(start).Milliseconds()), "commit", "")
	database.IncreaseTotalRequests("commit", "")
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
