package database

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

const (
	MessageSaved     = "saved"
	MessageError     = "error"
	MessageDuplicate = "duplicate"
	MessageNoSession = "no_session"
)

type Database interface {
	RecordBatchElements(number float64)
	RecordBatchInsertDuration(durMillis float64)
	RecordBulkElements(size float64, db, table string)
	RecordBulkInsertDuration(durMillis float64, db, table string)
	RecordRequestDuration(durMillis float64, method, table string)
	IncreaseTotalRequests(method, table string)
	IncreaseRedisRequests(method, table string)
	RecordRedisRequestDuration(durMillis float64, method, table string)
	IncreaseSaverMessages(platform, outcome string)
	RecordBulkDroppedRows(size float64, db, table string)
	IncreaseBulkSendRetries(db, table string)
	RecordCHQueueDepth(size float64)
	List() []prometheus.Collector
}

type databaseImpl struct {
	dbBatchElements           prometheus.Histogram
	dbBatchInsertDuration     prometheus.Histogram
	dbBulkElements            *prometheus.HistogramVec
	dbBulkInsertDuration      *prometheus.HistogramVec
	dbRequestDuration         *prometheus.HistogramVec
	dbTotalRequests           *prometheus.CounterVec
	cacheRedisRequests        *prometheus.CounterVec
	cacheRedisRequestDuration *prometheus.HistogramVec
	saverMessages             *prometheus.CounterVec
	bulkDroppedRows           *prometheus.CounterVec
	bulkSendRetries           *prometheus.CounterVec
	chQueueDepth              prometheus.Gauge
}

func New(serviceName string) Database {
	return &databaseImpl{
		dbBatchElements:           newBatchElements(serviceName),
		dbBatchInsertDuration:     newBatchInsertDuration(serviceName),
		dbBulkElements:            newBulkElements(serviceName),
		dbBulkInsertDuration:      newBulkInsertDuration(serviceName),
		dbRequestDuration:         newRequestDuration(serviceName),
		dbTotalRequests:           newTotalRequests(serviceName),
		cacheRedisRequests:        newRedisRequests(serviceName),
		cacheRedisRequestDuration: newRedisRequestDuration(serviceName),
		saverMessages:             newSaverMessages(serviceName),
		bulkDroppedRows:           newBulkDroppedRows(serviceName),
		bulkSendRetries:           newBulkSendRetries(serviceName),
		chQueueDepth:              newCHQueueDepth(serviceName),
	}
}

func (d *databaseImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		d.dbBatchElements,
		d.dbBatchInsertDuration,
		d.dbBulkElements,
		d.dbBulkInsertDuration,
		d.dbRequestDuration,
		d.dbTotalRequests,
		d.cacheRedisRequests,
		d.cacheRedisRequestDuration,
		d.saverMessages,
		d.bulkDroppedRows,
		d.bulkSendRetries,
		d.chQueueDepth,
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

func newSaverMessages(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "messages_total",
			Help:      "A counter displaying handled analytics messages by platform and outcome (saved/error/duplicate/no_session).",
		},
		[]string{"platform", "outcome"},
	)
}

func (d *databaseImpl) IncreaseSaverMessages(platform, outcome string) {
	d.saverMessages.WithLabelValues(platform, outcome).Inc()
}

func newBulkDroppedRows(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "bulk_dropped_rows_total",
			Help:      "A counter displaying rows permanently dropped because the batch could not be parsed by the database (data loss).",
		},
		[]string{"db", "table"},
	)
}

func (d *databaseImpl) RecordBulkDroppedRows(size float64, db, table string) {
	if size == 0 {
		return
	}
	d.bulkDroppedRows.WithLabelValues(db, table).Add(size)
}

func newBulkSendRetries(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "bulk_send_retries_total",
			Help:      "A counter displaying transient bulk send failures that were retried.",
		},
		[]string{"db", "table"},
	)
}

func (d *databaseImpl) IncreaseBulkSendRetries(db, table string) {
	d.bulkSendRetries.WithLabelValues(db, table).Inc()
}

func newCHQueueDepth(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "ch_worker_queue_depth",
			Help:      "A gauge displaying the current depth of the ClickHouse send-worker queue.",
		},
	)
}

func (d *databaseImpl) RecordCHQueueDepth(size float64) {
	d.chQueueDepth.Set(size)
}
