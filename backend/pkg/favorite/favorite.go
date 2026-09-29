package favorite

import (
	"context"
	"errors"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/jackc/pgx/v5"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

type Favorites interface {
	DoFavorite(ctx context.Context, projectID uint32, sessionID uint64, userID string) error
}

type favoritesImpl struct {
	log        logger.Logger
	conn       pool.Pool
	chConn     driver.Conn
	objStorage objectstorage.ObjectStorage
}

func New(log logger.Logger, conn pool.Pool, chConn driver.Conn, objStorage objectstorage.ObjectStorage) (Favorites, error) {
	return &favoritesImpl{
		log:        log,
		conn:       conn,
		chConn:     chConn,
		objStorage: objStorage,
	}, nil
}

func (f *favoritesImpl) DoFavorite(ctx context.Context, projectID uint32, sessionID uint64, userID string) error {
	if _, err := f.toggle(sessionID, userID); err != nil {
		return err
	}
	f.syncVault(projectID, sessionID)
	return nil
}

func (f *favoritesImpl) toggle(sessionID uint64, userID string) (bool, error) {
	var id uint64
	removeSQL := `DELETE FROM public.user_favorite_sessions WHERE user_id = $1 AND session_id = $2 RETURNING session_id;`
	err := f.conn.QueryRow(removeSQL, userID, sessionID).Scan(&id)
	if err == nil {
		return false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return false, fmt.Errorf("failed to remove favorite: %s", err)
	}
	addSQL := `INSERT INTO public.user_favorite_sessions(user_id, session_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING session_id;`
	err = f.conn.QueryRow(addSQL, userID, sessionID).Scan(&id)
	if err == nil || errors.Is(err, pgx.ErrNoRows) {
		return true, nil
	}
	return false, fmt.Errorf("failed to add favorite: %s", err)
}
