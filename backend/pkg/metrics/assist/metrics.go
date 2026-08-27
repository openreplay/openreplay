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

type assistImpl struct{}

func New(serviceName string) Assist { return &assistImpl{} }

func (a *assistImpl) List() []prometheus.Collector                     { return []prometheus.Collector{} }
func (a *assistImpl) RecordOnlineSessions(count float64)               {}
func (a *assistImpl) RecordNodes(count float64)                        {}
func (a *assistImpl) RecordStatsQueueDepth(count float64)              {}
func (a *assistImpl) IncreaseStatsEvents(eventType, eventState string) {}
func (a *assistImpl) IncreaseStatsDropped(reason string)               {}
