package ingest_keys

import (
	"context"
	"errors"
	"time"

	goredis "github.com/redis/go-redis/v9"

	"openreplay/backend/pkg/db/redis"
)

type sharedCache interface {
	get(ctx context.Context, key string) (string, bool, error)
	set(ctx context.Context, key, value string, ttl time.Duration) error
	setIfAbsent(ctx context.Context, key, value string, ttl time.Duration) error
}

type redisCache struct {
	client *redis.Client
}

func newSharedCache(client *redis.Client) sharedCache {
	if client == nil {
		return nil
	}
	return &redisCache{client: client}
}

func (c *redisCache) get(ctx context.Context, key string) (string, bool, error) {
	value, err := c.client.Redis.Get(ctx, key).Result()
	if errors.Is(err, goredis.Nil) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return value, true, nil
}

func (c *redisCache) set(ctx context.Context, key, value string, ttl time.Duration) error {
	return c.client.Redis.Set(ctx, key, value, ttl).Err()
}

func (c *redisCache) setIfAbsent(ctx context.Context, key, value string, ttl time.Duration) error {
	return c.client.Redis.SetNX(ctx, key, value, ttl).Err()
}
