package postgres

import (
	"errors"
	
	"github.com/jackc/pgconn"
	"github.com/jackc/pgerrcode"
)

func IsPkeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
		return true
	}
	return false
}