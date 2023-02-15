package metrics

import "github.com/prometheus/client_golang/prometheus"

var StorageSessionSize = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "storage_session_size_bytes",
	Help:      "A histogram of the raw session size in bytes.",
	Buckets:   defaultSizeBuckets,
})

var StorageTotalSessions = prometheus.NewCounter(prometheus.CounterOpts{
	Namespace: "storage",
	Name:      "storage_sessions_total",
	Help:      "A counter of the total number of processed sessions.",
})

var StorageSessionReadDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "storage_read_duration_seconds",
	Help:      "A histogram of the session read duration in seconds.",
	Buckets:   defaultDurationBuckets,
})

var StorageSessionSortDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "storage_sort_duration_seconds",
	Help:      "A histogram of the session read duration in seconds.",
	Buckets:   defaultDurationBuckets,
})

var StorageSessionEncodeDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "storage_encode_duration_seconds",
	Help:      "A histogram of the session read duration in seconds.",
	Buckets:   defaultDurationBuckets,
})

var StorageSessionCompressDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "storage_compress_duration_seconds",
	Help:      "A histogram of the session read duration in seconds.",
	Buckets:   defaultDurationBuckets,
})

var StorageSessionUploadDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
	Namespace: "storage",
	Name:      "storage_upload_duration_seconds",
	Help:      "A histogram of the session read duration in seconds.",
	Buckets:   defaultDurationBuckets,
})
