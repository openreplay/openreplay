package scheduler

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

const (
	OutcomeSuccess = "success"
	OutcomeError   = "error"
	OutcomeTimeout = "timeout"
	OutcomePanic   = "panic"
	OutcomeSkipped = "skipped"
)

type Scheduler interface {
	IncreaseRuns(job, outcome string)
	RecordRunDuration(job string, durMillis float64)
	SetLastSuccess(job string, unixSeconds float64)
	List() []prometheus.Collector
}

type schedulerImpl struct {
	runs        *prometheus.CounterVec
	runDuration *prometheus.HistogramVec
	lastSuccess *prometheus.GaugeVec
}

func New(serviceName string) Scheduler {
	return &schedulerImpl{
		runs: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "cron_runs_total",
			Help:      "Number of cron job runs, by job and outcome.",
		}, []string{"job", "outcome"}),
		runDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "cron_run_duration_seconds",
			Help:      "Duration of cron job runs, in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		}, []string{"job"}),
		lastSuccess: prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Namespace: serviceName,
			Name:      "cron_last_success_timestamp_seconds",
			Help:      "Unix timestamp of the last successful run, by job.",
		}, []string{"job"}),
	}
}

func (s *schedulerImpl) List() []prometheus.Collector {
	return []prometheus.Collector{s.runs, s.runDuration, s.lastSuccess}
}

func (s *schedulerImpl) IncreaseRuns(job, outcome string) {
	s.runs.WithLabelValues(job, outcome).Inc()
}

func (s *schedulerImpl) RecordRunDuration(job string, durMillis float64) {
	s.runDuration.WithLabelValues(job).Observe(durMillis / 1000.0)
}

func (s *schedulerImpl) SetLastSuccess(job string, unixSeconds float64) {
	s.lastSuccess.WithLabelValues(job).Set(unixSeconds)
}
