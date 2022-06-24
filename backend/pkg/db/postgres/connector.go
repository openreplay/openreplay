package postgres

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

func getTimeoutContext() context.Context {
	ctx, _ := context.WithTimeout(context.Background(), time.Duration(time.Second*30))
	return ctx
}

type batchItem struct {
	query     string
	arguments []interface{}
}

type Conn struct {
	c               *pgxpool.Pool // TODO: conditional usage of Pool/Conn (use interface?)
	batches         map[uint64]*pgx.Batch
	batchSizes      map[uint64]int
	rawBatches      map[uint64][]*batchItem
	batchQueueLimit int
	batchSizeLimit  int
}

func NewConn(url string, queueLimit, sizeLimit int) *Conn {
	c, err := pgxpool.Connect(context.Background(), url)
	if err != nil {
		log.Println(err)
		log.Fatalln("pgxpool.Connect Error")
	}
	return &Conn{
		c:               c,
		batches:         make(map[uint64]*pgx.Batch),
		batchSizes:      make(map[uint64]int),
		rawBatches:      make(map[uint64][]*batchItem),
		batchQueueLimit: queueLimit,
		batchSizeLimit:  sizeLimit,
	}
}

func (conn *Conn) Close() error {
	conn.c.Close()
	return nil
}

func (conn *Conn) batchQueue(sessionID uint64, sql string, args ...interface{}) {
	batch, ok := conn.batches[sessionID]
	if !ok {
		conn.batches[sessionID] = &pgx.Batch{}
		conn.rawBatches[sessionID] = make([]*batchItem, 0)
		batch = conn.batches[sessionID]
	}
	batch.Queue(sql, args...)
	// Temp raw batch store
	raw := conn.rawBatches[sessionID]
	raw = append(raw, &batchItem{
		query:     sql,
		arguments: args,
	})
	conn.rawBatches[sessionID] = raw
}

func (conn *Conn) CommitBatches() {
	for sessID, b := range conn.batches {
		br := conn.c.SendBatch(getTimeoutContext(), b)
		l := b.Len()
		for i := 0; i < l; i++ {
			if ct, err := br.Exec(); err != nil {
				log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessID, err)
				failedSql := conn.rawBatches[sessID][i]
				query := strings.ReplaceAll(failedSql.query, "\n", " ")
				log.Println("failed sql req:", query, failedSql.arguments)
			}
		}
		br.Close() // returns err
	}
	conn.batches = make(map[uint64]*pgx.Batch)
	conn.batchSizes = make(map[uint64]int)
	conn.rawBatches = make(map[uint64][]*batchItem)
}

func (conn *Conn) updateBatchSize(sessionID uint64, reqSize int) {
	conn.batchSizes[sessionID] += reqSize
	if conn.batchSizes[sessionID] >= conn.batchSizeLimit || conn.batches[sessionID].Len() >= conn.batchQueueLimit {
		conn.commitBatch(sessionID)
	}
}

// Send only one batch to pg
func (conn *Conn) commitBatch(sessionID uint64) {
	b, ok := conn.batches[sessionID]
	if !ok {
		log.Printf("can't find batch for session: %d", sessionID)
		return
	}
	br := conn.c.SendBatch(getTimeoutContext(), b)
	l := b.Len()
	for i := 0; i < l; i++ {
		if ct, err := br.Exec(); err != nil {
			log.Printf("Error in PG batch (command tag %s, session: %d): %v \n", ct.String(), sessionID, err)
			failedSql := conn.rawBatches[sessionID][i]
			query := strings.ReplaceAll(failedSql.query, "\n", " ")
			log.Println("failed sql req:", query, failedSql.arguments)
		}
	}
	br.Close()

	// Clean batch info
	delete(conn.batches, sessionID)
	delete(conn.batchSizes, sessionID)
	delete(conn.rawBatches, sessionID)
}

func (conn *Conn) query(sql string, args ...interface{}) (pgx.Rows, error) {
	return conn.c.Query(getTimeoutContext(), sql, args...)
}

func (conn *Conn) queryRow(sql string, args ...interface{}) pgx.Row {
	return conn.c.QueryRow(getTimeoutContext(), sql, args...)
}

func (conn *Conn) exec(sql string, args ...interface{}) error {
	_, err := conn.c.Exec(getTimeoutContext(), sql, args...)
	return err
}

type _Tx struct {
	pgx.Tx
}

func (conn *Conn) begin() (_Tx, error) {
	tx, err := conn.c.Begin(context.Background())
	return _Tx{tx}, err
}

func (tx _Tx) exec(sql string, args ...interface{}) error {
	_, err := tx.Exec(context.Background(), sql, args...)
	return err
}

func (tx _Tx) rollback() error {
	return tx.Rollback(context.Background())
}

func (tx _Tx) commit() error {
	return tx.Commit(context.Background())
}
