package reaper

import (
	"context"
	"strconv"
	"time"

	"github.com/lib/pq"
	goredis "github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/cleanup/registry"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
)

const opTimeout = 5 * time.Second

func NewRedisStore(client *redis.Client) PendingStore {
	if client == nil || client.Redis == nil {
		return nil
	}
	return &redisStore{redis: client.Redis}
}

type redisStore struct {
	redis *goredis.Client
}

func (s *redisStore) Due(nowMs int64, limit int64) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	return s.redis.ZRangeByScore(ctx, registry.PendingKey, &goredis.ZRangeBy{
		Min:    "-inf",
		Max:    strconv.FormatInt(nowMs, 10),
		Offset: 0,
		Count:  limit,
	}).Result()
}

func (s *redisStore) Remove(members ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	args := make([]interface{}, len(members))
	for i, m := range members {
		args[i] = m
	}
	return s.redis.ZRem(ctx, registry.PendingKey, args...).Err()
}

func NewPGSource(db pool.Pool) DurationSource {
	return &pgSource{db: db}
}

type pgSource struct {
	db pool.Pool
}

func (s *pgSource) Durations(sessionIDs []uint64) (map[uint64]*uint64, error) {
	rows, err := s.db.Query(`
		SELECT session_id, duration
		FROM sessions
		WHERE session_id = ANY($1)`, pq.Array(sessionIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	res := make(map[uint64]*uint64, len(sessionIDs))
	for rows.Next() {
		var (
			sessionID uint64
			duration  *uint64
		)
		if err := rows.Scan(&sessionID, &duration); err != nil {
			return nil, err
		}
		res[sessionID] = duration
	}
	return res, rows.Err()
}
