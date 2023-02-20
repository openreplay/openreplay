package http

import (
	"github.com/prometheus/client_golang/prometheus"
	"openreplay/backend/pkg/metrics/common"
	"strconv"
)

var httpRequestSize = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "http",
		Name:      "request_size_bytes",
		Help:      "A histogram displaying the size of each HTTP request in bytes.",
		Buckets:   common.DefaultSizeBuckets,
	},
	[]string{"url", "response_code"},
)

func RecordRequestSize(size float64, url string, code int) {
	httpRequestSize.WithLabelValues(url, strconv.Itoa(code)).Observe(size)
}

var httpRequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "http",
		Name:      "request_duration_seconds",
		Help:      "A histogram displaying the duration of each HTTP request in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"url", "response_code"},
)

func RecordRequestDuration(durMillis float64, url string, code int) {
	httpRequestDuration.WithLabelValues(url, strconv.Itoa(code)).Observe(durMillis / 1000.0)
}

var httpTotalRequests = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "http",
		Name:      "requests_total",
		Help:      "A counter displaying the number all HTTP requests.",
	},
)

func IncreaseTotalRequests() {
	httpTotalRequests.Inc()
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		httpRequestSize,
		httpRequestDuration,
		httpTotalRequests,
	}
}
