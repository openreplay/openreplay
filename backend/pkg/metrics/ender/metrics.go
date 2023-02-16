package ender

import "github.com/prometheus/client_golang/prometheus"

var enderActiveSessions = prometheus.NewGauge(
	prometheus.GaugeOpts{
		Namespace: "ender",
		Name:      "sessions_active",
		Help:      "A gauge displaying the number of active (live) sessions.",
	},
)

func IncreaseActiveSessions() {
	enderActiveSessions.Inc()
}

func DecreaseActiveSessions() {
	enderActiveSessions.Dec()
}

var enderClosedSessions = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "ender",
		Name:      "sessions_closed",
		Help:      "A counter displaying the number of closed sessions (sent SessionEnd).",
	},
)

func IncreaseClosedSessions() {
	enderClosedSessions.Inc()
}

var enderTotalSessions = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "ender",
		Name:      "sessions_total",
		Help:      "A counter displaying the number of all processed sessions.",
	},
)

func IncreaseTotalSessions() {
	enderTotalSessions.Inc()
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		enderActiveSessions,
		enderClosedSessions,
		enderTotalSessions,
	}
}
