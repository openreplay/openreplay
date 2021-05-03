package clickhouse

import (
	"errors"
	"database/sql"
)

type bulk struct {
	db    *sql.DB
	query string
	tx    *sql.Tx
	stmt  *sql.Stmt
}

func newBulk(db *sql.DB, query string) *bulk {
	return &bulk{
		db:    db,
		query: query,
	}
}

func (b *bulk) prepare() error {
	var err error
	b.tx, err = b.db.Begin()
	if err != nil {
		return err
	}
	b.stmt, err = b.tx.Prepare(b.query)
	if err != nil {
		return err
	}
	return nil
}

func (b *bulk) commit() error {
	return b.tx.Commit()
}

func (b *bulk) exec(args ...interface{}) error {
	if b.stmt == nil {
		return errors.New("Bulk is not prepared.")
	}
	_, err := b.stmt.Exec(args...)
	return err
}
