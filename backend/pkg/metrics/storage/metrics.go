package storage

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Storage interface {
	RecordSessionSize(fileSize float64, fileType string)
	IncreaseStorageTotalSessions()
	RecordSkippedSessionSize(fileSize float64, fileType string)
	IncreaseStorageTotalSkippedSessions()
	RecordSessionReadDuration(durMillis float64, fileType string)
	RecordSessionSortDuration(durMillis float64, fileType string)
	RecordSessionEncryptionDuration(durMillis float64, fileType string)
	RecordSessionCompressDuration(durMillis float64, fileType string)
	RecordSessionUploadDuration(durMillis float64, fileType string)
	RecordSessionCompressionRatio(ratio float64, fileType string)
	List() []prometheus.Collector
}

type storageImpl struct{}

func New(serviceName string) Storage { return &storageImpl{} }

func (s *storageImpl) List() []prometheus.Collector                                       { return []prometheus.Collector{} }
func (s *storageImpl) RecordSessionSize(fileSize float64, fileType string)                {}
func (s *storageImpl) IncreaseStorageTotalSessions()                                      {}
func (s *storageImpl) RecordSkippedSessionSize(fileSize float64, fileType string)         {}
func (s *storageImpl) IncreaseStorageTotalSkippedSessions()                               {}
func (s *storageImpl) RecordSessionReadDuration(durMillis float64, fileType string)       {}
func (s *storageImpl) RecordSessionSortDuration(durMillis float64, fileType string)       {}
func (s *storageImpl) RecordSessionEncryptionDuration(durMillis float64, fileType string) {}
func (s *storageImpl) RecordSessionCompressDuration(durMillis float64, fileType string)   {}
func (s *storageImpl) RecordSessionUploadDuration(durMillis float64, fileType string)     {}
func (s *storageImpl) RecordSessionCompressionRatio(ratio float64, fileType string)       {}
