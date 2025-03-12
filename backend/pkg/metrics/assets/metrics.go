package assets

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Assets interface {
	IncreaseProcessesSessions()
	IncreaseSavedSessions()
	RecordDownloadDuration(durMillis float64, code int)
	RecordUploadDuration(durMillis float64, isFailed bool)
	List() []prometheus.Collector
}

type assetsImpl struct{}

func New(serviceName string) Assets { return &assetsImpl{} }

func (a *assetsImpl) List() []prometheus.Collector                          { return []prometheus.Collector{} }
func (a *assetsImpl) IncreaseProcessesSessions()                            {}
func (a *assetsImpl) IncreaseSavedSessions()                                {}
func (a *assetsImpl) RecordDownloadDuration(durMillis float64, code int)    {}
func (a *assetsImpl) RecordUploadDuration(durMillis float64, isFailed bool) {}
