package ingest_keys

import (
	"context"
	"errors"
	"fmt"
	"time"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
)

const (
	redisTTL  = 5 * time.Minute
	localTTL  = time.Minute
	prefixLen = 8
)

var ErrNotFound = errors.New("ingest key not found")

type Key struct {
	ID        int        `json:"keyId"`
	ProjectID uint32     `json:"projectId"`
	Key       string     `json:"key,omitempty"`
	Prefix    string     `json:"prefix"`
	Name      string     `json:"name"`
	CreatedAt time.Time  `json:"createdAt"`
	RevokedAt *time.Time `json:"revokedAt"`
}

type Keys interface {
	Create(projectID uint32, name string) (*Key, error)
	List(projectID uint32) ([]*Key, error)
	Revoke(projectID uint32, keyID int) error
	Resolve(key string) (uint32, error)
}

type keysImpl struct {
	log   logger.Logger
	db    pool.Pool
	redis *redis.Client
	local cache.Cache
}

func New(log logger.Logger, db pool.Pool, redisClient *redis.Client) Keys {
	return &keysImpl{
		log:   log,
		db:    db,
		redis: redisClient,
		local: cache.New(localTTL, localTTL),
	}
}

func (k *keysImpl) Create(projectID uint32, name string) (*Key, error) {
	key := &Key{ProjectID: projectID, Name: name}
	if err := k.db.QueryRow(`
		INSERT INTO projects_ingest_keys (project_id, name)
		VALUES ($1, $2)
		RETURNING key_id, key, created_at`,
		projectID, name,
	).Scan(&key.ID, &key.Key, &key.CreatedAt); err != nil {
		return nil, err
	}
	key.Prefix = prefix(key.Key)
	return key, nil
}

func (k *keysImpl) List(projectID uint32) ([]*Key, error) {
	rows, err := k.db.Query(`
		SELECT key_id, key, name, created_at, revoked_at
		FROM projects_ingest_keys
		WHERE project_id = $1
		ORDER BY created_at DESC`,
		projectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := make([]*Key, 0)
	for rows.Next() {
		key := &Key{ProjectID: projectID}
		var secret string
		if err := rows.Scan(&key.ID, &secret, &key.Name, &key.CreatedAt, &key.RevokedAt); err != nil {
			return nil, err
		}
		key.Prefix = prefix(secret)
		keys = append(keys, key)
	}
	return keys, rows.Err()
}

func (k *keysImpl) Revoke(projectID uint32, keyID int) error {
	var secret string
	err := k.db.QueryRow(`
		UPDATE projects_ingest_keys
		SET revoked_at = (now() at time zone 'utc')
		WHERE key_id = $1 AND project_id = $2 AND revoked_at IS NULL
		RETURNING key`,
		keyID, projectID,
	).Scan(&secret)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			return ErrNotFound
		}
		return err
	}
	k.local.Set(secret, nil)
	if k.redis != nil {
		if err := k.redis.Redis.Del(context.Background(), redisKey(secret)).Err(); err != nil {
			k.log.Warn(context.Background(), "failed to drop revoked ingest key from redis: %s", err)
		}
	}
	return nil
}

func (k *keysImpl) Resolve(secret string) (uint32, error) {
	if v, ok := k.local.Get(secret); ok {
		if projectID, ok := v.(uint32); ok {
			return projectID, nil
		}
		return 0, ErrNotFound
	}
	if k.redis != nil {
		if projectID, err := k.redis.Redis.Get(context.Background(), redisKey(secret)).Uint64(); err == nil {
			k.local.Set(secret, uint32(projectID))
			return uint32(projectID), nil
		}
	}
	var projectID uint32
	err := k.db.QueryRow(`
		SELECT project_id
		FROM projects_ingest_keys
		WHERE key = $1 AND revoked_at IS NULL`,
		secret,
	).Scan(&projectID)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			return 0, ErrNotFound
		}
		return 0, err
	}
	k.local.Set(secret, projectID)
	if k.redis != nil {
		if err := k.redis.Redis.Set(context.Background(), redisKey(secret), uint64(projectID), redisTTL).Err(); err != nil {
			k.log.Warn(context.Background(), "failed to cache ingest key in redis: %s", err)
		}
	}
	return projectID, nil
}

func redisKey(secret string) string {
	return fmt.Sprintf("ingest_key:%s", secret)
}

func prefix(secret string) string {
	if len(secret) <= prefixLen {
		return secret
	}
	return secret[:prefixLen]
}
