package ender

import "github.com/prometheus/client_golang/prometheus"

type Ender interface {
	IncreaseActiveSessions()
	DecreaseActiveSessions()
	IncreaseClosedSessions()
	IncreaseTotalSessions()
	List() []prometheus.Collector
}

type enderImpl struct{}

func New(serviceName string) Ender { return &enderImpl{} }

func (e *enderImpl) List() []prometheus.Collector { return []prometheus.Collector{} }
func (e *enderImpl) IncreaseActiveSessions()      {}
func (e *enderImpl) DecreaseActiveSessions()      {}
func (e *enderImpl) IncreaseClosedSessions()      {}
func (e *enderImpl) IncreaseTotalSessions()       {}
