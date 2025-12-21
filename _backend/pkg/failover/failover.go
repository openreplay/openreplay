package failover

import (
	config "openreplay/backend/internal/config/storage"
	"openreplay/backend/internal/storage"
	"openreplay/backend/pkg/logger"
)

type SessionFinder interface {
	Find(sessionID, timestamp uint64)
	Stop()
}

// Finder mock for not configurable builds
type sessionFinderMock struct{}

func (s *sessionFinderMock) Find(sessionID, timestamp uint64) {}
func (s *sessionFinderMock) Stop()                            {}

func NewSessionFinder(log logger.Logger, cfg *config.Config, stg *storage.Storage) (SessionFinder, error) {
	return &sessionFinderMock{}, nil
}
