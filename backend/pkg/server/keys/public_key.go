package keys

import (
	"context"
	"fmt"
	"openreplay/backend/pkg/server/user"
	"time"

	"github.com/rs/xid"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

type Key struct {
	SpotID     uint64    `json:"-"`
	UserID     uint64    `json:"-"` // to track who generated the key
	TenantID   uint64    `json:"-"` // to check spot availability
	Value      string    `json:"value"`
	Expiration uint64    `json:"expiration"` // in seconds
	ExpiredAt  time.Time `json:"-"`
}

type Keys interface {
	Set(spotID, expiration uint64, user *user.User) (*Key, error)
	Get(spotID uint64, user *user.User) (*Key, error)
	IsValid(key string) (*user.User, error)
}

type keysImpl struct {
	log  logger.Logger
	conn pool.Pool
}

func (k *keysImpl) Set(spotID, expiration uint64, user *user.User) (*Key, error) {
	switch {
	case spotID == 0:
		return nil, fmt.Errorf("spotID is required")
	case expiration > 604800:
		return nil, fmt.Errorf("expiration should be less than 7 days")
	case user == nil:
		return nil, fmt.Errorf("user is required")
	}

	now := time.Now()
	if expiration == 0 {
		sql := `UPDATE spots.keys SET expired_at = $1, expiration = 0 WHERE spot_id = $2`
		if err := k.conn.Exec(sql, now, spotID); err != nil {
			k.log.Error(context.Background(), "failed to set key: %v", err)
			return nil, fmt.Errorf("key not updated")
		}
		return nil, nil
	}
	newKey := xid.New().String()
	expiredAt := now.Add(time.Duration(expiration) * time.Second)
	sql := `
	WITH updated AS (
    	UPDATE spots.keys
		SET
			spot_key = CASE
				WHEN expired_at < $1 THEN $2
				ELSE spot_key
			END,
			user_id = $3,
			expiration = $4,
			expired_at = $5,
			updated_at = $1
		WHERE spot_id = $6
  		RETURNING spot_key, expiration, expired_at
	),
	
	inserted AS (
		INSERT INTO spots.keys (spot_key, spot_id, user_id, expiration, created_at, expired_at)
		SELECT $2, $6, $3, $4, $1, $5
		WHERE NOT EXISTS (SELECT 1 FROM updated)
		RETURNING spot_key, expiration, expired_at
	)
	
	SELECT spot_key, expiration, expired_at FROM updated
	UNION ALL
	SELECT spot_key, expiration, expired_at FROM inserted;
	`
	key := &Key{}
	if err := k.conn.QueryRow(sql, now, newKey, user.ID, expiration, expiredAt, spotID).
		Scan(&key.Value, &key.Expiration, &key.ExpiredAt); err != nil {
		k.log.Error(context.Background(), "failed to set key: %v", err)
		return nil, fmt.Errorf("key not updated")
	}
	return key, nil
}

func (k *keysImpl) Get(spotID uint64, user *user.User) (*Key, error) {
	switch {
	case spotID == 0:
		return nil, fmt.Errorf("spotID is required")
	case user == nil:
		return nil, fmt.Errorf("user is required")
	}

	key := &Key{}
	sql := `SELECT k.spot_key, k.expiration, k.expired_at 
			FROM spots.keys k
			JOIN spots.spots s ON s.spot_id = k.spot_id
			WHERE k.spot_id = $1 AND s.tenant_id = $2`
	if err := k.conn.QueryRow(sql, spotID, user.TenantID).Scan(&key.Value, &key.Expiration, &key.ExpiredAt); err != nil {
		k.log.Error(context.Background(), "failed to get key: %v", err)
		return nil, fmt.Errorf("key not found")
	}
	now := time.Now()
	if key.ExpiredAt.Before(now) {
		return nil, fmt.Errorf("key is expired")
	}
	key.Expiration = uint64(key.ExpiredAt.Sub(now).Seconds())
	return key, nil
}

func (k *keysImpl) IsValid(key string) (*user.User, error) {
	if key == "" {
		return nil, fmt.Errorf("key is required")
	}
	var (
		userID    uint64
		expiredAt time.Time
	)
	// Get userID if key is valid
	sql := `SELECT user_id, expired_at FROM spots.keys WHERE spot_key = $1`
	if err := k.conn.QueryRow(sql, key).Scan(&userID, &expiredAt); err != nil {
		k.log.Error(context.Background(), "failed to get key: %v", err)
		return nil, fmt.Errorf("key not found")
	}
	now := time.Now()
	if expiredAt.Before(now) {
		return nil, fmt.Errorf("key is expired")
	}
	// Get user info by userID
	user := &user.User{ID: userID, AuthMethod: "public-key"}
	// We don't need tenantID here
	if err := k.conn.QueryRow(getUserSQL, userID).Scan(&user.TenantID, &user.Name, &user.Email); err != nil {
		k.log.Error(context.Background(), "failed to get user: %v", err)
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}

func NewKeys(log logger.Logger, conn pool.Pool) Keys {
	return &keysImpl{
		log:  log,
		conn: conn,
	}
}
