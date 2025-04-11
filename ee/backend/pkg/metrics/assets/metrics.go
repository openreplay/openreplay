package assets

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

type Assets interface {
	IncreaseProcessesSessions()
	IncreaseSavedSessions()
	RecordDownloadDuration(durMillis float64, code int)
	RecordUploadDuration(durMillis float64, isFailed bool)
	List() []prometheus.Collector
}

type assetsImpl struct {
	assetsProcessedSessions prometheus.Counter
	assetsSavedSessions     prometheus.Counter
	assetsDownloadDuration  *prometheus.HistogramVec
	assetsUploadDuration    *prometheus.HistogramVec
}

func New(serviceName string) Assets {
	return &assetsImpl{
		assetsProcessedSessions: newProcessedSessions(serviceName),
		assetsSavedSessions:     newSavedSessions(serviceName),
		assetsDownloadDuration:  newDownloadDuration(serviceName),
		assetsUploadDuration:    newUploadDuration(serviceName),
	}
}

func (a *assetsImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		a.assetsProcessedSessions,
		a.assetsSavedSessions,
		a.assetsDownloadDuration,
		a.assetsUploadDuration,
	}
}

func newProcessedSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "processed_total",
			Help:      "A counter displaying the total count of processed assets.",
		},
	)
}

func (a *assetsImpl) IncreaseProcessesSessions() {
	a.assetsProcessedSessions.Inc()
}

func newSavedSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "saved_total",
			Help:      "A counter displaying the total number of cached assets.",
		},
	)
}

func (a *assetsImpl) IncreaseSavedSessions() {
	a.assetsSavedSessions.Inc()
}

func newDownloadDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "download_duration_seconds",
			Help:      "A histogram displaying the duration of downloading for each asset in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"response_code"},
	)
}

func (a *assetsImpl) RecordDownloadDuration(durMillis float64, code int) {
	a.assetsDownloadDuration.WithLabelValues(strconv.Itoa(code)).Observe(durMillis / 1000.0)
}

func newUploadDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "upload_s3_duration_seconds",
			Help:      "A histogram displaying the duration of uploading to s3 for each asset in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"failed"},
	)
}

func (a *assetsImpl) RecordUploadDuration(durMillis float64, isFailed bool) {
	failed := "false"
	if isFailed {
		failed = "true"
	}
	a.assetsUploadDuration.WithLabelValues(failed).Observe(durMillis / 1000.0)
}
