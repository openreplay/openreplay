package storage

import (
	"github.com/prometheus/client_golang/prometheus"
)

const (
	UploadOK      = "uploaded"
	UploadMissing = "missing"
	UploadFailed  = "failed"
)

type Storage interface {
	RecordSessionSize(fileSize float64, fileType string)
	RecordSessionUploadDuration(durMillis float64, fileType, mode string)
	IncreaseUploads(fileType, outcome string)
	IncreaseUploadedBytes(size float64, fileType string)
	IncreaseFailedSessions()
	IncreaseSessionsNotFound()
	IncreaseSessionsWithoutStart()
	RecordDrainDuration(durMillis float64)
	List() []prometheus.Collector
}

type storageImpl struct{}

func New(serviceName string) Storage { return &storageImpl{} }

func (s *storageImpl) List() []prometheus.Collector                                         { return []prometheus.Collector{} }
func (s *storageImpl) RecordSessionSize(fileSize float64, fileType string)                  {}
func (s *storageImpl) RecordSessionUploadDuration(durMillis float64, fileType, mode string) {}
func (s *storageImpl) IncreaseUploads(fileType, outcome string)                             {}
func (s *storageImpl) IncreaseUploadedBytes(size float64, fileType string)                  {}
func (s *storageImpl) IncreaseFailedSessions()                                              {}
func (s *storageImpl) IncreaseSessionsNotFound()                                            {}
func (s *storageImpl) IncreaseSessionsWithoutStart()                                        {}
func (s *storageImpl) RecordDrainDuration(durMillis float64)                                {}
