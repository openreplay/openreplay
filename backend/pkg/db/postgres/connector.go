package postgres

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

func getTimeoutContext() context.Context {
	ctx, _ := context.WithTimeout(context.Background(), time.Duration(time.Second*30))
	return ctx
}

type Conn struct {
	c       *pgxpool.Pool // TODO: conditional usage of Pool/Conn (use interface?)
	batches map[uint64]*pgx.Batch
}

func NewConn(url string) *Conn {
	c, err := pgxpool.Connect(context.Background(), url)
	if err != nil {
		log.Println(err)
		log.Fatalln("pgxpool.Connect Error")
	}
	batches := make(map[uint64]*pgx.Batch)
	return &Conn{c, batches}
}

func (conn *Conn) Close() error {
	conn.c.Close()
	return nil
}

func (conn *Conn) batchQueue(sessionID uint64, sql string, args ...interface{}) error {
	batch, ok := conn.batches[sessionID]
	if !ok {
		conn.batches[sessionID] = &pgx.Batch{}
		batch = conn.batches[sessionID]
	}
	batch.Queue(sql, args...)
	return nil
}

func (conn *Conn) CommitBatches() {
	for _, b := range conn.batches {
		br := conn.c.SendBatch(getTimeoutContext(), b)
		l := b.Len()
		for i := 0; i < l; i++ {
			if ct, err := br.Exec(); err != nil {
				// TODO: ct info
				log.Printf("Error in PG batch (command tag %v): %v \n", ct.String(), err)
			}
		}
		br.Close() // returns err
	}
	conn.batches = make(map[uint64]*pgx.Batch)
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
