package service

import (
	"time"

	"openreplay/backend/pkg/db/redis"
)

func newRedisState(client *redis.Client, ttl time.Duration) userState {
	return nil
}
