package sink

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
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

type sinkImpl struct {
	messageSize          prometheus.Histogram
	writtenMessages      prometheus.Counter
	totalMessages        prometheus.Counter
	batchSize            prometheus.Histogram
	totalBatches         prometheus.Counter
	writtenBytes         *prometheus.HistogramVec
	totalWrittenBytes    *prometheus.CounterVec
	cachedAssets         prometheus.Gauge
	skippedAssets        prometheus.Counter
	totalAssets          prometheus.Counter
	assetSize            prometheus.Histogram
	processAssetDuration prometheus.Histogram
}

func New(serviceName string) Sink {
	return &sinkImpl{
		messageSize:          newMessageSize(serviceName),
		writtenMessages:      newWrittenMessages(serviceName),
		totalMessages:        newTotalMessages(serviceName),
		batchSize:            newBatchSize(serviceName),
		totalBatches:         newTotalBatches(serviceName),
		writtenBytes:         newWrittenBytes(serviceName),
		totalWrittenBytes:    newTotalWrittenBytes(serviceName),
		cachedAssets:         newCachedAssets(serviceName),
		skippedAssets:        newSkippedAssets(serviceName),
		totalAssets:          newTotalAssets(serviceName),
		assetSize:            newAssetSize(serviceName),
		processAssetDuration: newProcessAssetDuration(serviceName),
	}
}

func (s *sinkImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		s.messageSize,
		s.writtenMessages,
		s.totalMessages,
		s.batchSize,
		s.totalBatches,
		s.writtenBytes,
		s.totalWrittenBytes,
		s.cachedAssets,
		s.skippedAssets,
		s.totalAssets,
		s.assetSize,
		s.processAssetDuration,
	}
}

func newMessageSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "message_size_bytes",
			Help:      "A histogram displaying the size of each message in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
	)
}

func (s *sinkImpl) RecordMessageSize(size float64) {
	s.messageSize.Observe(size)
}

func newWrittenMessages(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "messages_written",
			Help:      "A counter displaying the total number of all written messages.",
		},
	)
}

func (s *sinkImpl) IncreaseWrittenMessages() {
	s.writtenMessages.Inc()
}

func newTotalMessages(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "messages_total",
			Help:      "A counter displaying the total number of all processed messages.",
		},
	)
}

func (s *sinkImpl) IncreaseTotalMessages() {
	s.totalMessages.Inc()
}

func newBatchSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "batch_size_bytes",
			Help:      "A histogram displaying the size of each batch in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
	)
}

func (s *sinkImpl) RecordBatchSize(size float64) {
	s.batchSize.Observe(size)
}

func newTotalBatches(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "batches_total",
			Help:      "A counter displaying the total number of all written batches.",
		},
	)
}

func (s *sinkImpl) IncreaseTotalBatches() {
	s.totalBatches.Inc()
}

func newWrittenBytes(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "written_bytes",
			Help:      "A histogram displaying the size of buffer in bytes written to session file.",
			Buckets:   common.DefaultSizeBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *sinkImpl) RecordWrittenBytes(size float64, fileType string) {
	if size == 0 {
		return
	}
	s.writtenBytes.WithLabelValues(fileType).Observe(size)
	s.IncreaseTotalWrittenBytes(size, fileType)
}

func newTotalWrittenBytes(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "written_bytes_total",
			Help:      "A counter displaying the total number of bytes written to all session files.",
		},
		[]string{"file_type"},
	)
}

func (s *sinkImpl) IncreaseTotalWrittenBytes(size float64, fileType string) {
	if size == 0 {
		return
	}
	s.totalWrittenBytes.WithLabelValues(fileType).Add(size)
}

func newCachedAssets(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "assets_cached",
			Help:      "A gauge displaying the current number of cached assets.",
		},
	)
}

func (s *sinkImpl) IncreaseCachedAssets() {
	s.cachedAssets.Inc()
}

func (s *sinkImpl) DecreaseCachedAssets() {
	s.cachedAssets.Dec()
}

func newSkippedAssets(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "assets_skipped",
			Help:      "A counter displaying the total number of all skipped assets.",
		},
	)
}

func (s *sinkImpl) IncreaseSkippedAssets() {
	s.skippedAssets.Inc()
}

func newTotalAssets(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "assets_total",
			Help:      "A counter displaying the total number of all processed assets.",
		},
	)
}

func (s *sinkImpl) IncreaseTotalAssets() {
	s.totalAssets.Inc()
}

func newAssetSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "asset_size_bytes",
			Help:      "A histogram displaying the size of each asset in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
	)
}

func (s *sinkImpl) RecordAssetSize(size float64) {
	s.assetSize.Observe(size)
}

func newProcessAssetDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "asset_process_duration_seconds",
			Help:      "A histogram displaying the duration of processing for each asset in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (s *sinkImpl) RecordProcessAssetDuration(durMillis float64) {
	s.processAssetDuration.Observe(durMillis / 1000.0)
}
