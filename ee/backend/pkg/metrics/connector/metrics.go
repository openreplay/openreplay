package connector

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

const (
	MessageHandled   = "handled"
	MessageFiltered  = "filtered"
	MessageNoSession = "no_session"
	TableEvents      = "events"
	TableSessions    = "sessions"
)

type Connector interface {
	IncreaseMessages(outcome string)
	IncreaseInsertedRows(count float64, table string)
	IncreaseDroppedRows(count float64, table string)
	RecordInsertDuration(durMillis float64, table string)
	IncreaseZombieSessions(count float64)
	RecordPendingSessions(count float64)
	List() []prometheus.Collector
}

type connectorImpl struct {
	messages        *prometheus.CounterVec
	insertedRows    *prometheus.CounterVec
	droppedRows     *prometheus.CounterVec
	insertDuration  *prometheus.HistogramVec
	zombieSessions  prometheus.Counter
	pendingSessions prometheus.Gauge
}

func New(serviceName string) Connector {
	return &connectorImpl{
		messages:        newMessages(serviceName),
		insertedRows:    newInsertedRows(serviceName),
		droppedRows:     newDroppedRows(serviceName),
		insertDuration:  newInsertDuration(serviceName),
		zombieSessions:  newZombieSessions(serviceName),
		pendingSessions: newPendingSessions(serviceName),
	}
}

func (c *connectorImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		c.messages,
		c.insertedRows,
		c.droppedRows,
		c.insertDuration,
		c.zombieSessions,
		c.pendingSessions,
	}
}

func newMessages(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "messages_total",
			Help:      "A counter displaying consumed messages by outcome (handled/filtered/no_session).",
		},
		[]string{"outcome"},
	)
}

func (c *connectorImpl) IncreaseMessages(outcome string) {
	c.messages.WithLabelValues(outcome).Inc()
}

func newInsertedRows(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "inserted_rows_total",
			Help:      "A counter displaying rows successfully written to the destination, by table.",
		},
		[]string{"table"},
	)
}

func (c *connectorImpl) IncreaseInsertedRows(count float64, table string) {
	if count == 0 {
		return
	}
	c.insertedRows.WithLabelValues(table).Add(count)
}

func newDroppedRows(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "dropped_rows_total",
			Help:      "A counter displaying rows discarded after a failed batch insert (data loss), by table.",
		},
		[]string{"table"},
	)
}

func (c *connectorImpl) IncreaseDroppedRows(count float64, table string) {
	if count == 0 {
		return
	}
	c.droppedRows.WithLabelValues(table).Add(count)
}

func newInsertDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "insert_duration_seconds",
			Help:      "A histogram displaying the duration of batch inserts into the destination in seconds, by table.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"table"},
	)
}

func (c *connectorImpl) RecordInsertDuration(durMillis float64, table string) {
	c.insertDuration.WithLabelValues(table).Observe(durMillis / 1000.0)
}

func newZombieSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "zombie_sessions_total",
			Help:      "A counter displaying sessions flushed without a SessionEnd message after the inactivity timeout.",
		},
	)
}

func (c *connectorImpl) IncreaseZombieSessions(count float64) {
	if count == 0 {
		return
	}
	c.zombieSessions.Add(count)
}

func newPendingSessions(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "pending_sessions",
			Help:      "A gauge displaying sessions currently held in memory waiting to be flushed.",
		},
	)
}

func (c *connectorImpl) RecordPendingSessions(count float64) {
	c.pendingSessions.Set(count)
}
