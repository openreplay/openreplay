package scheduler

import "github.com/prometheus/client_golang/prometheus"

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

type schedulerImpl struct{}

func New(serviceName string) Scheduler { return &schedulerImpl{} }

func (s *schedulerImpl) List() []prometheus.Collector                    { return []prometheus.Collector{} }
func (s *schedulerImpl) IncreaseRuns(job, outcome string)                {}
func (s *schedulerImpl) RecordRunDuration(job string, durMillis float64) {}
func (s *schedulerImpl) SetLastSuccess(job string, unixSeconds float64)  {}
