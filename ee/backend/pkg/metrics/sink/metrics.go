package sink

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
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

type sinkImpl struct {
	messages             *prometheus.CounterVec
	batchSize            prometheus.Histogram
	writtenBytes         *prometheus.HistogramVec
	cachedAssets         prometheus.Gauge
	skippedAssets        prometheus.Counter
	totalAssets          prometheus.Counter
	assetSize            prometheus.Histogram
	processAssetDuration prometheus.Histogram
	openFiles            prometheus.Gauge
	openFilesLimit       prometheus.Gauge
	fileEvictions        prometheus.Counter
	syncDuration         prometheus.Histogram
	syncedBytes          prometheus.Counter
	staleEvictions       prometheus.Counter
	triggerErrors        prometheus.Counter
}

func New(serviceName string) Sink {
	return &sinkImpl{
		messages:             newMessages(serviceName),
		batchSize:            newBatchSize(serviceName),
		writtenBytes:         newWrittenBytes(serviceName),
		cachedAssets:         newCachedAssets(serviceName),
		skippedAssets:        newSkippedAssets(serviceName),
		totalAssets:          newTotalAssets(serviceName),
		assetSize:            newAssetSize(serviceName),
		processAssetDuration: newProcessAssetDuration(serviceName),
		openFiles:            newOpenFiles(serviceName),
		openFilesLimit:       newOpenFilesLimit(serviceName),
		fileEvictions:        newFileEvictions(serviceName),
		syncDuration:         newSyncDuration(serviceName),
		syncedBytes:          newSyncedBytes(serviceName),
		staleEvictions:       newStaleEvictions(serviceName),
		triggerErrors:        newTriggerErrors(serviceName),
	}
}

func (s *sinkImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		s.messages,
		s.batchSize,
		s.writtenBytes,
		s.cachedAssets,
		s.skippedAssets,
		s.totalAssets,
		s.assetSize,
		s.processAssetDuration,
		s.openFiles,
		s.openFilesLimit,
		s.fileEvictions,
		s.syncDuration,
		s.syncedBytes,
		s.staleEvictions,
		s.triggerErrors,
	}
}

func newMessages(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "messages_total",
			Help:      "A counter displaying consumed messages by outcome (written/filtered/trigger/error).",
		},
		[]string{"outcome"},
	)
}

func (s *sinkImpl) IncreaseMessages(outcome string) {
	s.messages.WithLabelValues(outcome).Inc()
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

func newOpenFiles(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "open_files",
			Help:      "A gauge displaying the current number of open session files in the file pool.",
		},
	)
}

func newOpenFilesLimit(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "open_files_limit",
			Help:      "A gauge displaying the maximum number of open session files in the file pool (FS_ULIMIT).",
		},
	)
}

func (s *sinkImpl) RecordOpenFiles(count, limit float64) {
	s.openFiles.Set(count)
	s.openFilesLimit.Set(limit)
}

func newFileEvictions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "file_evictions_total",
			Help:      "A counter displaying the total number of session files evicted from the file pool due to the open files limit.",
		},
	)
}

func (s *sinkImpl) IncreaseFileEvictions(count float64) {
	if count == 0 {
		return
	}
	s.fileEvictions.Add(count)
}

func newSyncDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "sync_duration_seconds",
			Help:      "A histogram displaying the duration of periodic session file syncs to disk in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (s *sinkImpl) RecordSyncDuration(durMillis float64) {
	s.syncDuration.Observe(durMillis / 1000.0)
}

func newSyncedBytes(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "synced_bytes_total",
			Help:      "A counter displaying the total number of bytes flushed to disk by periodic syncs.",
		},
	)
}

func (s *sinkImpl) IncreaseSyncedBytes(size float64) {
	if size == 0 {
		return
	}
	s.syncedBytes.Add(size)
}

func newStaleEvictions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "stale_sessions_evicted_total",
			Help:      "A counter displaying the total number of sessions evicted by TTL due to inactivity (potential data loss).",
		},
	)
}

func (s *sinkImpl) IncreaseStaleSessionsEvicted(count float64) {
	if count == 0 {
		return
	}
	s.staleEvictions.Add(count)
}

func newTriggerErrors(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "trigger_produce_errors_total",
			Help:      "A counter displaying failures to produce SessionEnd to the trigger topics (storage may miss the session).",
		},
	)
}

func (s *sinkImpl) IncreaseTriggerErrors() {
	s.triggerErrors.Inc()
}
