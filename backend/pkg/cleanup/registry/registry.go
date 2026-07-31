package registry

import (
	"openreplay/backend/pkg/db/redis"
	"openreplay/backend/pkg/logger"
)

type registryMock struct {
}

type Registry interface {
	Register(sessionID uint64, isMobile bool, deadlineMs int64)
	Done(sessionID uint64)
}

func New(log logger.Logger, client *redis.Client) Registry {
	return &registryMock{}
}

func (r *registryMock) Register(sessionID uint64, isMobile bool, deadlineMs int64) {}

func (r *registryMock) Done(sessionID uint64) {}
