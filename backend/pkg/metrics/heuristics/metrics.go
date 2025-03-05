package heuristics

import (
	"github.com/prometheus/client_golang/prometheus"
	"openreplay/backend/pkg/metrics/common"
	"strconv"
)

var heuristicsTotalEvents = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Namespace: "heuristics",
		Name:      "events_total",
		Help:      "A counter displaying the number of all processed events",
	},
	[]string{"type"},
)

func IncreaseTotalEvents(eventType string) {
	heuristicsTotalEvents.WithLabelValues(eventType).Inc()
}

var heuristicsRequestSize = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "heuristics",
		Name:      "request_size_bytes",
		Help:      "A histogram displaying the size of each HTTP request in bytes.",
		Buckets:   common.DefaultSizeBuckets,
	},
	[]string{"url", "response_code"},
)

func RecordRequestSize(size float64, url string, code int) {
	heuristicsRequestSize.WithLabelValues(url, strconv.Itoa(code)).Observe(size)
}

var heuristicsRequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "heuristics",
		Name:      "request_duration_seconds",
		Help:      "A histogram displaying the duration of each HTTP request in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"url", "response_code"},
)

func RecordRequestDuration(durMillis float64, url string, code int) {
	heuristicsRequestDuration.WithLabelValues(url, strconv.Itoa(code)).Observe(durMillis / 1000.0)
}

var heuristicsTotalRequests = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "heuristics",
		Name:      "requests_total",
		Help:      "A counter displaying the number all HTTP requests.",
	},
)

func IncreaseTotalRequests() {
	heuristicsTotalRequests.Inc()
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		heuristicsTotalEvents,
	}
}
