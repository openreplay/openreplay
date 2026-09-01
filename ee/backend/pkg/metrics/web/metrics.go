package web

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

const (
	RejectEmptyBody           = "empty_body"
	RejectTooLarge            = "too_large"
	RejectBadJSON             = "bad_json"
	RejectTrackerOutdated     = "tracker_outdated"
	RejectNoProjectKey        = "no_project_key"
	RejectProjectNotFound     = "project_not_found"
	RejectProjectError        = "project_error"
	RejectPlatformUnsupported = "platform_unsupported"
	RejectBrowserUnrecognized = "browser_unrecognized"
	RejectSampleRateMiss      = "sample_rate_miss"
	RejectInternalError       = "internal_error"
)

type Web interface {
	RecordRequestSize(size float64, url string, code int)
	RecordRequestDuration(durMillis float64, url string, code int)
	IncreaseStartRejects(platform, reason string)
	List() []prometheus.Collector
}

type webImpl struct {
	httpRequestSize     *prometheus.HistogramVec
	httpRequestDuration *prometheus.HistogramVec
	startRejects        *prometheus.CounterVec
}

func New(serviceName string) Web {
	return &webImpl{
		httpRequestSize:     newRequestSizeMetric(serviceName),
		httpRequestDuration: newRequestDurationMetric(serviceName),
		startRejects:        newStartRejects(serviceName),
	}
}

func (w *webImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		w.httpRequestSize,
		w.httpRequestDuration,
		w.startRejects,
	}
}

func newRequestSizeMetric(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "web_request_size_bytes",
			Help:      "A histogram displaying the size of each HTTP request in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
		[]string{"url", "response_code"},
	)
}

func (w *webImpl) RecordRequestSize(size float64, url string, code int) {
	w.httpRequestSize.WithLabelValues(url, strconv.Itoa(code)).Observe(size)
}

func newRequestDurationMetric(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "web_request_duration_seconds",
			Help:      "A histogram displaying the duration of each HTTP request in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"url", "response_code"},
	)
}

func (w *webImpl) RecordRequestDuration(durMillis float64, url string, code int) {
	w.httpRequestDuration.WithLabelValues(url, strconv.Itoa(code)).Observe(durMillis / 1000.0)
}

func newStartRejects(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "start_rejects_total",
			Help:      "A counter displaying rejected session-start requests by platform and reason (sessions lost at the front door).",
		},
		[]string{"platform", "reason"},
	)
}

func (w *webImpl) IncreaseStartRejects(platform, reason string) {
	w.startRejects.WithLabelValues(platform, reason).Inc()
}
