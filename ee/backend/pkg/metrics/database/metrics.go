package database

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

type Database interface {
	RecordBatchElements(number float64)
	RecordBatchInsertDuration(durMillis float64)
	RecordBulkSize(size float64, db, table string)
	RecordBulkElements(size float64, db, table string)
	RecordBulkInsertDuration(durMillis float64, db, table string)
	RecordRequestDuration(durMillis float64, method, table string)
	IncreaseTotalRequests(method, table string)
	IncreaseRedisRequests(method, table string)
	RecordRedisRequestDuration(durMillis float64, method, table string)
	List() []prometheus.Collector
}

type databaseImpl struct {
	dbBatchElements           prometheus.Histogram
	dbBatchInsertDuration     prometheus.Histogram
	dbBulkSize                *prometheus.HistogramVec
	dbBulkElements            *prometheus.HistogramVec
	dbBulkInsertDuration      *prometheus.HistogramVec
	dbRequestDuration         *prometheus.HistogramVec
	dbTotalRequests           *prometheus.CounterVec
	cacheRedisRequests        *prometheus.CounterVec
	cacheRedisRequestDuration *prometheus.HistogramVec
}

func New(serviceName string) Database {
	return &databaseImpl{
		dbBatchElements:           newBatchElements(serviceName),
		dbBatchInsertDuration:     newBatchInsertDuration(serviceName),
		dbBulkSize:                newBulkSize(serviceName),
		dbBulkElements:            newBulkElements(serviceName),
		dbBulkInsertDuration:      newBulkInsertDuration(serviceName),
		dbRequestDuration:         newRequestDuration(serviceName),
		dbTotalRequests:           newTotalRequests(serviceName),
		cacheRedisRequests:        newRedisRequests(serviceName),
		cacheRedisRequestDuration: newRedisRequestDuration(serviceName),
	}
}

func (d *databaseImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		d.dbBatchElements,
		d.dbBatchInsertDuration,
		d.dbBulkSize,
		d.dbBulkElements,
		d.dbBulkInsertDuration,
		d.dbRequestDuration,
		d.dbTotalRequests,
		d.cacheRedisRequests,
		d.cacheRedisRequestDuration,
	}
}

func newBatchElements(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "batch_size_elements",
			Help:      "A histogram displaying the number of SQL commands in each batch.",
			Buckets:   common.DefaultBuckets,
		},
	)
}

func (d *databaseImpl) RecordBatchElements(number float64) {
	d.dbBatchElements.Observe(number)
}

func newBatchInsertDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "batch_insert_duration_seconds",
			Help:      "A histogram displaying the duration of batch inserts in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (d *databaseImpl) RecordBatchInsertDuration(durMillis float64) {
	d.dbBatchInsertDuration.Observe(durMillis / 1000.0)
}

func newBulkSize(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "bulk_size_bytes",
			Help:      "A histogram displaying the bulk size in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
		[]string{"db", "table"},
	)
}

func (d *databaseImpl) RecordBulkSize(size float64, db, table string) {
	d.dbBulkSize.WithLabelValues(db, table).Observe(size)
}

func newBulkElements(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "bulk_size_elements",
			Help:      "A histogram displaying the size of data set in each bulk.",
			Buckets:   common.DefaultBuckets,
		},
		[]string{"db", "table"},
	)
}

func (d *databaseImpl) RecordBulkElements(size float64, db, table string) {
	d.dbBulkElements.WithLabelValues(db, table).Observe(size)
}

func newBulkInsertDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "bulk_insert_duration_seconds",
			Help:      "A histogram displaying the duration of bulk inserts in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"db", "table"},
	)
}

func (d *databaseImpl) RecordBulkInsertDuration(durMillis float64, db, table string) {
	d.dbBulkInsertDuration.WithLabelValues(db, table).Observe(durMillis / 1000.0)
}

func newRequestDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "request_duration_seconds",
			Help:      "A histogram displaying the duration of each sql request in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"method", "table"},
	)
}

func (d *databaseImpl) RecordRequestDuration(durMillis float64, method, table string) {
	d.dbRequestDuration.WithLabelValues(method, table).Observe(durMillis / 1000.0)
}

func newTotalRequests(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "requests_total",
			Help:      "A counter showing the total number of all SQL requests.",
		},
		[]string{"method", "table"},
	)
}

func (d *databaseImpl) IncreaseTotalRequests(method, table string) {
	d.dbTotalRequests.WithLabelValues(method, table).Inc()
}

func newRedisRequests(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "redis_requests_total",
			Help:      "A counter showing the total number of all Redis requests.",
		},
		[]string{"method", "table"},
	)
}

func (d *databaseImpl) IncreaseRedisRequests(method, table string) {
	d.cacheRedisRequests.WithLabelValues(method, table).Inc()
}

func newRedisRequestDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "redis_request_duration_seconds",
			Help:      "A histogram displaying the duration of each Redis request in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"method", "table"},
	)
}

func (d *databaseImpl) RecordRedisRequestDuration(durMillis float64, method, table string) {
	d.cacheRedisRequestDuration.WithLabelValues(method, table).Observe(durMillis / 1000.0)
}
