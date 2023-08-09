package database

import (
	"github.com/prometheus/client_golang/prometheus"
	"openreplay/backend/pkg/metrics/common"
)

var dbBatchElements = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "db",
		Name:      "batch_size_elements",
		Help:      "A histogram displaying the number of SQL commands in each batch.",
		Buckets:   common.DefaultBuckets,
	},
)

func RecordBatchElements(number float64) {
	dbBatchElements.Observe(number)
}

var dbBatchInsertDuration = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "db",
		Name:      "batch_insert_duration_seconds",
		Help:      "A histogram displaying the duration of batch inserts in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
)

func RecordBatchInsertDuration(durMillis float64) {
	dbBatchInsertDuration.Observe(durMillis / 1000.0)
}

var dbBulkSize = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "db",
		Name:      "bulk_size_bytes",
		Help:      "A histogram displaying the bulk size in bytes.",
		Buckets:   common.DefaultSizeBuckets,
	},
	[]string{"db", "table"},
)

func RecordBulkSize(size float64, db, table string) {
	dbBulkSize.WithLabelValues(db, table).Observe(size)
}

var dbBulkElements = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "db",
		Name:      "bulk_size_elements",
		Help:      "A histogram displaying the size of data set in each bulk.",
		Buckets:   common.DefaultBuckets,
	},
	[]string{"db", "table"},
)

func RecordBulkElements(size float64, db, table string) {
	dbBulkElements.WithLabelValues(db, table).Observe(size)
}

var dbBulkInsertDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "db",
		Name:      "bulk_insert_duration_seconds",
		Help:      "A histogram displaying the duration of bulk inserts in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"db", "table"},
)

func RecordBulkInsertDuration(durMillis float64, db, table string) {
	dbBulkInsertDuration.WithLabelValues(db, table).Observe(durMillis / 1000.0)
}

var dbRequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "db",
		Name:      "request_duration_seconds",
		Help:      "A histogram displaying the duration of each sql request in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"method", "table"},
)

func RecordRequestDuration(durMillis float64, method, table string) {
	dbRequestDuration.WithLabelValues(method, table).Observe(durMillis / 1000.0)
}

var dbTotalRequests = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Namespace: "db",
		Name:      "requests_total",
		Help:      "A counter showing the total number of all SQL requests.",
	},
	[]string{"method", "table"},
)

func IncreaseTotalRequests(method, table string) {
	dbTotalRequests.WithLabelValues(method, table).Inc()
}

var cacheRedisRequests = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Namespace: "cache",
		Name:      "redis_requests_total",
		Help:      "A counter showing the total number of all Redis requests.",
	},
	[]string{"method", "table"},
)

func IncreaseRedisRequests(method, table string) {
	cacheRedisRequests.WithLabelValues(method, table).Inc()
}

var cacheRedisRequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "cache",
		Name:      "redis_request_duration_seconds",
		Help:      "A histogram displaying the duration of each Redis request in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"method", "table"},
)

func RecordRedisRequestDuration(durMillis float64, method, table string) {
	cacheRedisRequestDuration.WithLabelValues(method, table).Observe(durMillis / 1000.0)
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		dbBatchElements,
		dbBatchInsertDuration,
		dbBulkSize,
		dbBulkElements,
		dbBulkInsertDuration,
		dbRequestDuration,
		dbTotalRequests,
		cacheRedisRequests,
		cacheRedisRequestDuration,
	}
}
