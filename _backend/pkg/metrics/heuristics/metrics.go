package heuristics

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Heuristics interface {
	IncreaseTotalEvents(eventType string)
	List() []prometheus.Collector
}

type heuristicsImpl struct{}

func New(serviceName string) Heuristics { return &heuristicsImpl{} }

func (h *heuristicsImpl) List() []prometheus.Collector         { return []prometheus.Collector{} }
func (h *heuristicsImpl) IncreaseTotalEvents(eventType string) {}
