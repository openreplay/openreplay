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

type enderImpl struct{}

func New(serviceName string) Ender { return &enderImpl{} }

func (e *enderImpl) List() []prometheus.Collector                      { return []prometheus.Collector{} }
func (e *enderImpl) IncreaseActiveSessions()                           {}
func (e *enderImpl) DecreaseActiveSessions()                           {}
func (e *enderImpl) IncreaseTotalSessions()                            {}
func (e *enderImpl) IncreaseSessionEnds(outcome string, count float64) {}
func (e *enderImpl) IncreaseEndErrors(stage string, count float64)     {}
func (e *enderImpl) IncreaseRebalanceEvictions(count float64)          {}
