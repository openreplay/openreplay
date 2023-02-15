package storage

import (
	"github.com/prometheus/client_golang/prometheus"
	"openreplay/backend/pkg/metrics/common"
)

var storageSessionSize = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "session_size_bytes",
	Help:      "A histogram of the raw session size in bytes.",
	Buckets:   common.DefaultSizeBuckets,
})

var storageTotalSessions = prometheus.NewCounter(prometheus.CounterOpts{
	Namespace: "storage",
	Name:      "sessions_total",
	Help:      "A counter of the total number of processed sessions.",
})

var storageSessionReadDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "read_duration_seconds",
	Help:      "A histogram of the session read duration in seconds.",
	Buckets:   common.DefaultDurationBuckets,
})

var storageSessionSortDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "sort_duration_seconds",
	Help:      "A histogram of the session sort duration in seconds.",
	Buckets:   common.DefaultDurationBuckets,
})

var storageSessionEncodeDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "encode_duration_seconds",
	Help:      "A histogram of the session encode duration in seconds.",
	Buckets:   common.DefaultDurationBuckets,
})

var storageSessionCompressDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "compress_duration_seconds",
	Help:      "A histogram of the session compress duration in seconds.",
	Buckets:   common.DefaultDurationBuckets,
})

var storageSessionUploadDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "upload_duration_seconds",
	Help:      "A histogram of the session upload duration in seconds.",
	Buckets:   common.DefaultDurationBuckets,
})

func Metrics() []prometheus.Collector {
	return []prometheus.Collector{
		storageSessionSize,
		storageTotalSessions,
		storageSessionReadDuration,
		storageSessionSortDuration,
		storageSessionEncodeDuration,
		storageSessionCompressDuration,
		storageSessionUploadDuration,
	}
}
