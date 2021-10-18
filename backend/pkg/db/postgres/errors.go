package postgres

import (
	"errors"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgerrcode"
)

func IsPkeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation 
}

func IsNoRowsErr(err error) bool {
	return err == pgx.ErrNoRows
}
