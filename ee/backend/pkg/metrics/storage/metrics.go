package storage

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
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

type storageImpl struct {
	sessionSize           *prometheus.HistogramVec
	sessionUploadDuration *prometheus.HistogramVec
	uploads               *prometheus.CounterVec
	uploadedBytes         *prometheus.CounterVec
	failedSessions        prometheus.Counter
	sessionsNotFound      prometheus.Counter
	sessionsWithoutStart  prometheus.Counter
	drainDuration         prometheus.Histogram
}

func New(serviceName string) Storage {
	return &storageImpl{
		sessionSize:           newSessionSize(serviceName),
		sessionUploadDuration: newSessionUploadDuration(serviceName),
		uploads:               newUploads(serviceName),
		uploadedBytes:         newUploadedBytes(serviceName),
		failedSessions:        newFailedSessions(serviceName),
		sessionsNotFound:      newSessionsNotFound(serviceName),
		sessionsWithoutStart:  newSessionsWithoutStart(serviceName),
		drainDuration:         newDrainDuration(serviceName),
	}
}

func (s *storageImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		s.sessionSize,
		s.sessionUploadDuration,
		s.uploads,
		s.uploadedBytes,
		s.failedSessions,
		s.sessionsNotFound,
		s.sessionsWithoutStart,
		s.drainDuration,
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

func newSessionUploadDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "upload_duration_seconds",
			Help:      "A histogram displaying the wall-clock duration of the streaming upload pipeline (read+compress/encrypt+S3 PUT) in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"file_type", "mode"},
	)
}

func (s *storageImpl) RecordSessionUploadDuration(durMillis float64, fileType, mode string) {
	s.sessionUploadDuration.WithLabelValues(fileType, mode).Observe(durMillis / 1000.0)
}

func newUploads(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "uploads_total",
			Help:      "A counter displaying session file uploads by outcome (uploaded/missing/failed).",
		},
		[]string{"file_type", "outcome"},
	)
}

func (s *storageImpl) IncreaseUploads(fileType, outcome string) {
	s.uploads.WithLabelValues(fileType, outcome).Inc()
}

func newUploadedBytes(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "uploaded_bytes_total",
			Help:      "A counter displaying bytes actually sent to object storage (post compression/encryption).",
		},
		[]string{"file_type"},
	)
}

func (s *storageImpl) IncreaseUploadedBytes(size float64, fileType string) {
	if size == 0 {
		return
	}
	s.uploadedBytes.WithLabelValues(fileType).Add(size)
}

func newFailedSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "failed_sessions_total",
			Help:      "A counter displaying sessions whose DOM upload failed — the replay is broken or incomplete.",
		},
	)
}

func (s *storageImpl) IncreaseFailedSessions() {
	s.failedSessions.Inc()
}

func newSessionsNotFound(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "sessions_not_found_total",
			Help:      "A counter displaying SessionEnd triggers for which no local session files were found.",
		},
	)
}

func (s *storageImpl) IncreaseSessionsNotFound() {
	s.sessionsNotFound.Inc()
}

func newSessionsWithoutStart(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "sessions_without_start_total",
			Help:      "A counter displaying sessions uploaded without their first DOM part (degraded replay).",
		},
	)
}

func (s *storageImpl) IncreaseSessionsWithoutStart() {
	s.sessionsWithoutStart.Inc()
}

func newDrainDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "drain_duration_seconds",
			Help:      "A histogram displaying how long the upload pool takes to drain before a consumer commit (upload backlog).",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (s *storageImpl) RecordDrainDuration(durMillis float64) {
	s.drainDuration.Observe(durMillis / 1000.0)
}
