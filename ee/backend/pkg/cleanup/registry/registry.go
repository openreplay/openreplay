package registry

import (
	"context"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/cache"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
)

const opTimeout = 500 * time.Millisecond

type Registry interface {
	Register(sessionID uint64, isMobile bool, deadlineMs int64)
	Done(sessionID uint64)
}

type store interface {
	add(member string, score int64) error
	remove(members ...string) error
}

type registryImpl struct {
	log  logger.Logger
	db   store
	seen cache.Cache // local dedup to avoid a ZADD on every batch of a session
}

func New(log logger.Logger, client *redis.Client) Registry {
	var db store
	if client != nil && client.Redis != nil {
		db = &redisStore{redis: client.Redis}
	}
	return newWithStore(log, db)
}

func newWithStore(log logger.Logger, db store) Registry {
	return &registryImpl{
		log:  log,
		db:   db,
		seen: cache.New(10*time.Minute, time.Hour),
	}
}

func (r *registryImpl) Register(sessionID uint64, isMobile bool, deadlineMs int64) {
	if r.db == nil || sessionID == 0 {
		return
	}
	if _, ok := r.seen.Get(sessionID); ok {
		return
	}
	if err := r.db.add(Member(sessionID, isMobile), deadlineMs); err != nil {
		ctx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessionID))
		r.log.Warn(ctx, "failed to register session for cleanup: %s", err)
		return
	}
	r.seen.Set(sessionID, struct{}{})
}

func (r *registryImpl) Done(sessionID uint64) {
	if r.db == nil || sessionID == 0 {
		return
	}
	if err := r.db.remove(Member(sessionID, false), Member(sessionID, true)); err != nil {
		ctx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessionID))
		r.log.Warn(ctx, "failed to deregister session from cleanup: %s", err)
	}
}

type redisStore struct {
	redis *goredis.Client
}

func (s *redisStore) add(member string, score int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	return s.redis.ZAddNX(ctx, PendingKey, goredis.Z{Score: float64(score), Member: member}).Err()
}

func (s *redisStore) remove(members ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), opTimeout)
	defer cancel()
	args := make([]interface{}, len(members))
	for i, m := range members {
		args[i] = m
	}
	return s.redis.ZRem(ctx, PendingKey, args...).Err()
}
