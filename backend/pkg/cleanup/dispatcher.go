package cleanup

import (
	config "openreplay/backend/internal/config/ender"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/queue/types"
)

type dispatcherMock struct {
}

type Dispatcher interface {
	Close()
}

func NewDispatcher(log logger.Logger, cfg *config.Config, producer types.Producer) (Dispatcher, error) {
	return &dispatcherMock{}, nil
}

func (d *dispatcherMock) Close() {}
