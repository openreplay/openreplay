package sink

import (
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MessageWritten  = "written"
	MessageFiltered = "filtered"
	MessageTrigger  = "trigger"
	MessageError    = "error"
)

type Sink interface {
	IncreaseMessages(outcome string)
	RecordBatchSize(size float64)
	RecordWrittenBytes(size float64, fileType string)
	IncreaseCachedAssets()
	DecreaseCachedAssets()
	IncreaseSkippedAssets()
	IncreaseTotalAssets()
	RecordAssetSize(size float64)
	RecordProcessAssetDuration(durMillis float64)
	RecordOpenFiles(count, limit float64)
	IncreaseFileEvictions(count float64)
	RecordSyncDuration(durMillis float64)
	IncreaseSyncedBytes(size float64)
	IncreaseStaleSessionsEvicted(count float64)
	IncreaseTriggerErrors()
	List() []prometheus.Collector
}

type sinkImpl struct{}

func New(serviceName string) Sink { return &sinkImpl{} }

func (s *sinkImpl) List() []prometheus.Collector                     { return []prometheus.Collector{} }
func (s *sinkImpl) IncreaseMessages(outcome string)                  {}
func (s *sinkImpl) RecordBatchSize(size float64)                     {}
func (s *sinkImpl) RecordWrittenBytes(size float64, fileType string) {}
func (s *sinkImpl) IncreaseCachedAssets()                            {}
func (s *sinkImpl) DecreaseCachedAssets()                            {}
func (s *sinkImpl) IncreaseSkippedAssets()                           {}
func (s *sinkImpl) IncreaseTotalAssets()                             {}
func (s *sinkImpl) RecordAssetSize(size float64)                     {}
func (s *sinkImpl) RecordProcessAssetDuration(durMillis float64)     {}
func (s *sinkImpl) RecordOpenFiles(count, limit float64)             {}
func (s *sinkImpl) IncreaseFileEvictions(count float64)              {}
func (s *sinkImpl) RecordSyncDuration(durMillis float64)             {}
func (s *sinkImpl) IncreaseSyncedBytes(size float64)                 {}
func (s *sinkImpl) IncreaseStaleSessionsEvicted(count float64)       {}
func (s *sinkImpl) IncreaseTriggerErrors()                           {}
