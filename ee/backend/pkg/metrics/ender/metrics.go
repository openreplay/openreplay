package ender

import "github.com/prometheus/client_golang/prometheus"

type Ender interface {
	IncreaseActiveSessions()
	DecreaseActiveSessions()
	IncreaseClosedSessions()
	IncreaseTotalSessions()
	List() []prometheus.Collector
}

type enderImpl struct {
	activeSessions prometheus.Gauge
	closedSessions prometheus.Counter
	totalSessions  prometheus.Counter
}

func New(serviceName string) Ender {
	return &enderImpl{
		activeSessions: newActiveSessions(serviceName),
		closedSessions: newClosedSessions(serviceName),
		totalSessions:  newTotalSessions(serviceName),
	}
}

func (e *enderImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		e.activeSessions,
		e.closedSessions,
		e.totalSessions,
	}
}

func newActiveSessions(serviceName string) prometheus.Gauge {
	return prometheus.NewGauge(
		prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "sessions_active",
			Help:      "A gauge displaying the number of active (live) sessions.",
		},
	)
}

func (e *enderImpl) IncreaseActiveSessions() {
	e.activeSessions.Inc()
}

func (e *enderImpl) DecreaseActiveSessions() {
	e.activeSessions.Dec()
}

func newClosedSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "sessions_closed",
			Help:      "A counter displaying the number of closed sessions (sent SessionEnd).",
		},
	)
}

func (e *enderImpl) IncreaseClosedSessions() {
	e.closedSessions.Inc()
}

func newTotalSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "sessions_total",
			Help:      "A counter displaying the number of all processed sessions.",
		},
	)
}

func (e *enderImpl) IncreaseTotalSessions() {
	e.totalSessions.Inc()
}
