package cleanup

import (
	config "openreplay/backend/internal/config/ender"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/queue/types"
)

type dispatcherMock struct {
}

type Dispatcher interface {
	ActivePartitions(parts []uint64)
	Close()
}

func NewDispatcher(log logger.Logger, cfg *config.Config, producer types.Producer, db pool.Pool, redisClient *redis.Client) (Dispatcher, error) {
	return &dispatcherMock{}, nil
}

func (d *dispatcherMock) ActivePartitions(parts []uint64) {}

func (d *dispatcherMock) Close() {}
