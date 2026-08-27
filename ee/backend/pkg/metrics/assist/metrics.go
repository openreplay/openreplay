package assist

import (
	"github.com/prometheus/client_golang/prometheus"
)

const (
	DropParse        = "parse"
	DropInsert       = "insert"
	DropUpdate       = "update"
	DropUnknownState = "unknown_state"
)

type Assist interface {
	RecordOnlineSessions(count float64)
	RecordNodes(count float64)
	RecordStatsQueueDepth(count float64)
	IncreaseStatsEvents(eventType, eventState string)
	IncreaseStatsDropped(reason string)
	List() []prometheus.Collector
}

type assistImpl struct {
	onlineSessions  prometheus.Gauge
	nodes           prometheus.Gauge
	statsQueueDepth prometheus.Gauge
	statsEvents     *prometheus.CounterVec
	statsDropped    *prometheus.CounterVec
}

func New(serviceName string) Assist {
	return &assistImpl{
		onlineSessions:  newOnlineSessions(serviceName),
		nodes:           newNodes(serviceName),
		statsQueueDepth: newStatsQueueDepth(serviceName),
		statsEvents:     newStatsEvents(serviceName),
		statsDropped:    newStatsDropped(serviceName),
	}
}

func (a *assistImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		a.onlineSessions,
		a.nodes,
		a.statsQueueDepth,
		a.statsEvents,
		a.statsDropped,
	}
}

func newOnlineSessions(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "online_sessions",
			Help:      "A gauge displaying the number of live assist sessions, derived cluster-wide from the Redis online-session keys (matches what the API shows).",
		},
	)
}

func (a *assistImpl) RecordOnlineSessions(count float64) {
	a.onlineSessions.Set(count)
}

func newNodes(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "nodes",
			Help:      "A gauge displaying the number of live assist WebSocket nodes reporting into Redis (assist:nodes:*).",
		},
	)
}

func (a *assistImpl) RecordNodes(count float64) {
	a.nodes.Set(count)
}

func newStatsQueueDepth(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "stats_queue_depth",
			Help:      "A gauge displaying the depth of the assist:stats Redis list at each consumer tick; sustained growth means the stats consumer is falling behind (unbounded Redis memory).",
		},
	)
}

func (a *assistImpl) RecordStatsQueueDepth(count float64) {
	a.statsQueueDepth.Set(count)
}

func newStatsEvents(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "stats_events_total",
			Help:      "A counter displaying processed assist stats events by type (assist/call/control/record) and state (start/end).",
		},
		[]string{"event_type", "event_state"},
	)
}

func (a *assistImpl) IncreaseStatsEvents(eventType, eventState string) {
	a.statsEvents.WithLabelValues(eventType, eventState).Inc()
}

func newStatsDropped(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "stats_events_dropped_total",
			Help:      "A counter displaying assist stats events consumed from Redis but not persisted, by reason (lost assist analytics).",
		},
		[]string{"reason"},
	)
}

func (a *assistImpl) IncreaseStatsDropped(reason string) {
	a.statsDropped.WithLabelValues(reason).Inc()
}
