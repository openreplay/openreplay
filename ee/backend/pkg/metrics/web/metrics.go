package web

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

type Web interface {
	RecordRequestSize(size float64, url string, code int)
	RecordRequestDuration(durMillis float64, url string, code int)
	IncreaseTotalRequests()
	List() []prometheus.Collector
}

type webImpl struct {
	httpRequestSize     *prometheus.HistogramVec
	httpRequestDuration *prometheus.HistogramVec
	httpTotalRequests   prometheus.Counter
}

func New(serviceName string) Web {
	return &webImpl{
		httpRequestSize:     newRequestSizeMetric(serviceName),
		httpRequestDuration: newRequestDurationMetric(serviceName),
		httpTotalRequests:   newTotalRequestsMetric(serviceName),
	}
}

func (w *webImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		w.httpRequestSize,
		w.httpRequestDuration,
		w.httpTotalRequests,
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

func newTotalRequestsMetric(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "web_requests_total",
			Help:      "A counter displaying the number all HTTP requests.",
		},
	)
}

func (w *webImpl) IncreaseTotalRequests() {
	w.httpTotalRequests.Inc()
}
