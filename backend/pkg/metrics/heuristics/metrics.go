package heuristics

import "github.com/prometheus/client_golang/prometheus"

var heuristicsTotalEvents = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Namespace: "heuristics",
		Name:      "events_total",
		Help:      "A counter displaying the number of all processed events",
	},
	[]string{"type"},
)

func IncreaseTotalEvents(eventType string) {
	heuristicsTotalEvents.WithLabelValues(eventType).Inc()
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		heuristicsTotalEvents,
	}
}
