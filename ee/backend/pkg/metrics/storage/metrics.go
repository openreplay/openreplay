package storage

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
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

type storageImpl struct {
	sessionSize               *prometheus.HistogramVec
	totalSessions             prometheus.Counter
	skippedSessionSize        *prometheus.HistogramVec
	totalSkippedSessions      prometheus.Counter
	sessionReadDuration       *prometheus.HistogramVec
	sessionSortDuration       *prometheus.HistogramVec
	sessionEncryptionDuration *prometheus.HistogramVec
	sessionCompressDuration   *prometheus.HistogramVec
	sessionUploadDuration     *prometheus.HistogramVec
	sessionCompressionRatio   *prometheus.HistogramVec
}

func New(serviceName string) Storage {
	return &storageImpl{
		sessionSize:               newSessionSize(serviceName),
		totalSessions:             newTotalSessions(serviceName),
		skippedSessionSize:        newSkippedSessionSize(serviceName),
		totalSkippedSessions:      newTotalSkippedSessions(serviceName),
		sessionReadDuration:       newSessionReadDuration(serviceName),
		sessionSortDuration:       newSessionSortDuration(serviceName),
		sessionEncryptionDuration: newSessionEncryptionDuration(serviceName),
		sessionCompressDuration:   newSessionCompressDuration(serviceName),
		sessionUploadDuration:     newSessionUploadDuration(serviceName),
		sessionCompressionRatio:   newSessionCompressionRatio(serviceName),
	}
}

func (s *storageImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		s.sessionSize,
		s.totalSessions,
		s.skippedSessionSize,
		s.sessionReadDuration,
		s.sessionSortDuration,
		s.sessionEncryptionDuration,
		s.sessionCompressDuration,
		s.sessionUploadDuration,
		s.sessionCompressionRatio,
	}
}

func newSessionSize(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "session_size_bytes",
			Help:      "A histogram displaying the size of each session file in bytes prior to any manipulation.",
			Buckets:   common.DefaultSizeBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSessionSize(fileSize float64, fileType string) {
	s.sessionSize.WithLabelValues(fileType).Observe(fileSize)
}

func newTotalSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "sessions_total",
			Help:      "A counter displaying the total number of all processed sessions.",
		},
	)
}

func (s *storageImpl) IncreaseStorageTotalSessions() {
	s.totalSessions.Inc()
}

func newSkippedSessionSize(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "skipped_session_size_bytes",
			Help:      "A histogram displaying the size of each skipped session file in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSkippedSessionSize(fileSize float64, fileType string) {
	s.skippedSessionSize.WithLabelValues(fileType).Observe(fileSize)
}

func newTotalSkippedSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "sessions_skipped_total",
			Help:      "A counter displaying the total number of all skipped sessions because of the size limits.",
		},
	)
}

func (s *storageImpl) IncreaseStorageTotalSkippedSessions() {
	s.totalSkippedSessions.Inc()
}

func newSessionReadDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "read_duration_seconds",
			Help:      "A histogram displaying the duration of reading for each session in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSessionReadDuration(durMillis float64, fileType string) {
	s.sessionReadDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func newSessionSortDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "sort_duration_seconds",
			Help:      "A histogram displaying the duration of sorting for each session in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSessionSortDuration(durMillis float64, fileType string) {
	s.sessionSortDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func newSessionEncryptionDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "encryption_duration_seconds",
			Help:      "A histogram displaying the duration of encoding for each session in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSessionEncryptionDuration(durMillis float64, fileType string) {
	s.sessionEncryptionDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func newSessionCompressDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "compress_duration_seconds",
			Help:      "A histogram displaying the duration of compressing for each session in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSessionCompressDuration(durMillis float64, fileType string) {
	s.sessionCompressDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func newSessionUploadDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "upload_duration_seconds",
			Help:      "A histogram displaying the duration of uploading to s3 for each session in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSessionUploadDuration(durMillis float64, fileType string) {
	s.sessionUploadDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func newSessionCompressionRatio(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "compression_ratio",
			Help:      "A histogram displaying the compression ratio of mob files for each session.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) RecordSessionCompressionRatio(ratio float64, fileType string) {
	s.sessionCompressionRatio.WithLabelValues(fileType).Observe(ratio)
}
