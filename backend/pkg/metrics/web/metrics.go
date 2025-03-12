package web

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Web interface {
	RecordRequestSize(size float64, url string, code int)
	RecordRequestDuration(durMillis float64, url string, code int)
	IncreaseTotalRequests()
	List() []prometheus.Collector
}

type webImpl struct{}

func New(serviceName string) Web { return &webImpl{} }

func (w *webImpl) List() []prometheus.Collector                                  { return []prometheus.Collector{} }
func (w *webImpl) RecordRequestSize(size float64, url string, code int)          {}
func (w *webImpl) RecordRequestDuration(durMillis float64, url string, code int) {}
func (w *webImpl) IncreaseTotalRequests()                                        {}
