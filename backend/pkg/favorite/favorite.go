package favorite

import (
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Favorites interface {
	Add(sessionID uint64, userID string) error
	IsExist(sessionID uint64, userID string) bool
	Remove(sessionID uint64, userID string) error
}

type favoritesImpl struct {
	log  logger.Logger
	conn pool.Pool
}

func New(log logger.Logger, conn pool.Pool) (Favorites, error) {
	return &favoritesImpl{
		log:  log,
		conn: conn,
	}, nil
}

func (f *favoritesImpl) Add(sessionID uint64, userID string) error {
	sql := `INSERT INTO public.user_favorite_sessions(user_id, session_id) VALUES ($1, $2) RETURNING session_id;`
	var existingSessionID uint64
	if err := f.conn.QueryRow(sql, userID, sessionID).Scan(&existingSessionID); err != nil {
		if err.Error() == "no rows in result set" {
			return fmt.Errorf("failed to add favorite: session %s for user %s does not exist", sessionID, userID)
		}
		return fmt.Errorf("failed to add favorite: %w", err)
	}
	return nil
}

func (f *favoritesImpl) IsExist(sessionID uint64, userID string) bool {
	sql := `SELECT session_id FROM public.user_favorite_sessions WHERE session_id = $1 AND user_id = $2;`
	var existingSessionID uint64
	if err := f.conn.QueryRow(sql, sessionID, userID).Scan(&existingSessionID); err != nil {
		if err.Error() == "no rows in result set" {
			return false // session does not exist in favorites
		}
		f.log.Error(nil, "failed to check favorite existence: %v", err)
		return false // error occurred, assume session is not a favorite
	}
	if existingSessionID == sessionID {
		return true
	}
	return false
}

func (f *favoritesImpl) Remove(sessionID uint64, userID string) error {
	sql := `DELETE FROM public.user_favorite_sessions WHERE user_id = $1 AND session_id = $2 RETURNING session_id;`
	var existingSessionID uint64
	if err := f.conn.QueryRow(sql, userID, sessionID).Scan(&existingSessionID); err != nil {
		if err.Error() == "no rows in result set" {
			return fmt.Errorf("failed to remove favorite: session %s for user %s does not exist", sessionID, userID)
		}
		return fmt.Errorf("failed to remove favorite: %w", err)
	}
	return nil
}
