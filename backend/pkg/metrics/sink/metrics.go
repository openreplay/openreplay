package sink

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Sink interface {
	RecordMessageSize(size float64)
	IncreaseWrittenMessages()
	IncreaseTotalMessages()
	RecordBatchSize(size float64)
	IncreaseTotalBatches()
	RecordWrittenBytes(size float64, fileType string)
	IncreaseTotalWrittenBytes(size float64, fileType string)
	IncreaseCachedAssets()
	DecreaseCachedAssets()
	IncreaseSkippedAssets()
	IncreaseTotalAssets()
	RecordAssetSize(size float64)
	RecordProcessAssetDuration(durMillis float64)
	List() []prometheus.Collector
}

type sinkImpl struct{}

func New(serviceName string) Sink { return &sinkImpl{} }

func (s *sinkImpl) List() []prometheus.Collector                            { return []prometheus.Collector{} }
func (s *sinkImpl) RecordMessageSize(size float64)                          {}
func (s *sinkImpl) IncreaseWrittenMessages()                                {}
func (s *sinkImpl) IncreaseTotalMessages()                                  {}
func (s *sinkImpl) RecordBatchSize(size float64)                            {}
func (s *sinkImpl) IncreaseTotalBatches()                                   {}
func (s *sinkImpl) RecordWrittenBytes(size float64, fileType string)        {}
func (s *sinkImpl) IncreaseTotalWrittenBytes(size float64, fileType string) {}
func (s *sinkImpl) IncreaseCachedAssets()                                   {}
func (s *sinkImpl) DecreaseCachedAssets()                                   {}
func (s *sinkImpl) IncreaseSkippedAssets()                                  {}
func (s *sinkImpl) IncreaseTotalAssets()                                    {}
func (s *sinkImpl) RecordAssetSize(size float64)                            {}
func (s *sinkImpl) RecordProcessAssetDuration(durMillis float64)            {}
