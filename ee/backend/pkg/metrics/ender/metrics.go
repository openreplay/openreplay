package ender

import "github.com/prometheus/client_golang/prometheus"

const (
	EndNew             = "new"
	EndUpdated         = "updated"
	EndDuplicate       = "duplicate"
	EndShorter         = "shorter"
	EndNotFound        = "not_found"
	EndFailed          = "failed"
	EndNegative        = "negative"
	StageLoad          = "load"
	StageUpdate        = "update"
	StageProduce       = "produce"
	StageProduceCanvas = "produce_canvas"
)

type Ender interface {
	IncreaseActiveSessions()
	DecreaseActiveSessions()
	IncreaseTotalSessions()
	IncreaseSessionEnds(outcome string, count float64)
	IncreaseEndErrors(stage string, count float64)
	IncreaseRebalanceEvictions(count float64)
	List() []prometheus.Collector
}

type enderImpl struct {
	activeSessions     prometheus.Gauge
	totalSessions      prometheus.Counter
	sessionEnds        *prometheus.CounterVec
	endErrors          *prometheus.CounterVec
	rebalanceEvictions prometheus.Counter
}

func New(serviceName string) Ender {
	return &enderImpl{
		activeSessions:     newActiveSessions(serviceName),
		totalSessions:      newTotalSessions(serviceName),
		sessionEnds:        newSessionEnds(serviceName),
		endErrors:          newEndErrors(serviceName),
		rebalanceEvictions: newRebalanceEvictions(serviceName),
	}
}

func (e *enderImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		e.activeSessions,
		e.totalSessions,
		e.sessionEnds,
		e.endErrors,
		e.rebalanceEvictions,
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

func newTotalSessions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "sessions_total",
			Help:      "A counter displaying the number of sessions registered by the ender (first message seen).",
		},
	)
}

func (e *enderImpl) IncreaseTotalSessions() {
	e.totalSessions.Inc()
}

func newSessionEnds(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "session_ends_total",
			Help:      "A counter displaying finalised ended-session candidates by outcome (new/updated/duplicate/shorter/not_found/failed/negative).",
		},
		[]string{"outcome"},
	)
}

func (e *enderImpl) IncreaseSessionEnds(outcome string, count float64) {
	if count == 0 {
		return
	}
	e.sessionEnds.WithLabelValues(outcome).Add(count)
}

func newEndErrors(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "session_end_errors_total",
			Help:      "A counter displaying failures while finalising ended sessions by stage (load/update/produce are retried, produce_canvas is not).",
		},
		[]string{"stage"},
	)
}

func (e *enderImpl) IncreaseEndErrors(stage string, count float64) {
	if count == 0 {
		return
	}
	e.endErrors.WithLabelValues(stage).Add(count)
}

func newRebalanceEvictions(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "rebalance_evicted_sessions_total",
			Help:      "A counter displaying tracked sessions dropped from memory because their partition was revoked on rebalance.",
		},
	)
}

func (e *enderImpl) IncreaseRebalanceEvictions(count float64) {
	if count == 0 {
		return
	}
	e.rebalanceEvictions.Add(count)
}
