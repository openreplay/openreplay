package heuristics

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Heuristics interface {
	IncreaseTotalEvents(eventType string)
	List() []prometheus.Collector
}

type heuristicsImpl struct {
	totalEvents *prometheus.CounterVec
}

func New(serviceName string) Heuristics {
	return &heuristicsImpl{
		totalEvents: newTotalEvents(serviceName),
	}
}

func newTotalEvents(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "events_total",
			Help:      "A counter displaying the number of all processed events",
		},
		[]string{"type"},
	)
}

func (h *heuristicsImpl) IncreaseTotalEvents(eventType string) {
	h.totalEvents.WithLabelValues(eventType).Inc()
}

func (h *heuristicsImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		h.totalEvents,
	}
}
