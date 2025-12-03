package favorite

import (
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

type Favorites interface {
	DoFavorite(sessionID uint64, userID string) error
}

type favoritesImpl struct {
	log        logger.Logger
	conn       pool.Pool
	objStorage objectstorage.ObjectStorage
}

func New(log logger.Logger, conn pool.Pool, objStorage objectstorage.ObjectStorage) (Favorites, error) {
	return &favoritesImpl{
		log:        log,
		conn:       conn,
		objStorage: objStorage,
	}, nil
}

func (f *favoritesImpl) DoFavorite(sessionID uint64, userID string) (err error) {
	if f.isExist(sessionID, userID) {
		setTags(f.objStorage, sessionID, true)
		return f.remove(sessionID, userID)
	} else {
		setTags(f.objStorage, sessionID, false)
		return f.add(sessionID, userID)
	}
}

func (f *favoritesImpl) add(sessionID uint64, userID string) error {
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

func (f *favoritesImpl) isExist(sessionID uint64, userID string) bool {
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

func (f *favoritesImpl) remove(sessionID uint64, userID string) error {
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
