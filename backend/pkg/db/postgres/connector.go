package postgres

import (
	"context"
	"log"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

func getTimeoutContext() context.Context {
	ctx, _ := context.WithTimeout(context.Background(), time.Duration(time.Second*10))
	return ctx
}

type Conn struct {
	c *pgxpool.Pool  // TODO: conditional usage of Pool/Conn (use interface?)
}

func NewConn(url string) *Conn {
	c, err := pgxpool.Connect(context.Background(), url)
	if err != nil {
		log.Fatalln(err)
	}
	return &Conn{c}
}

func (conn *Conn) Close() error {
	conn.c.Close()
	return nil
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
	return err;
}

func (tx _Tx) rollback() error {
	return tx.Rollback(context.Background())
}

func (tx _Tx) commit() error {
	return tx.Commit(context.Background())
}


