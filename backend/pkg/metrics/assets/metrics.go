package assets

import (
	"github.com/prometheus/client_golang/prometheus"
)

const (
	TaskUploaded  = "uploaded"           // downloaded and stored
	TaskDedupSkip = "dedup_skip"         // suppressed by the in-process timeoutMap
	TaskFreshSkip = "fresh_skip"         // stored object is younger than MAX_STORAGE_TIME
	TaskDropped   = "dropped_queue_full" // shed on a full worker pool / retry heap
	TaskTerminal  = "terminal"           // download failed permanently (see terminal_failures_total{reason})
)

const (
	ResolveHit   = "hit"
	ResolveMiss  = "miss"
	ResolveError = "error"
)

type Assets interface {
	IncreaseTasks(outcome string)
	IncreaseThrottled()
	IncreaseRetries(reason string)
	IncreaseTerminalFailures(reason string)
	RecordRetryQueueSize(size float64)
	RecordPoolQueueSize(size float64)
	IncreaseConsumePausedTime(seconds float64)
	RecordDownloadDuration(durMillis float64, code int)
	RecordDownloadBytes(size float64)
	RecordUploadDuration(durMillis float64)
	RecordStoredBytes(size float64, encoding string)
	RecordAssetResolve(result string)
	List() []prometheus.Collector
}

type assetsImpl struct{}

func New(serviceName string) Assets { return &assetsImpl{} }

func (a *assetsImpl) List() []prometheus.Collector                       { return []prometheus.Collector{} }
func (a *assetsImpl) IncreaseTasks(outcome string)                       {}
func (a *assetsImpl) IncreaseThrottled()                                 {}
func (a *assetsImpl) IncreaseRetries(reason string)                      {}
func (a *assetsImpl) IncreaseTerminalFailures(reason string)             {}
func (a *assetsImpl) RecordRetryQueueSize(size float64)                  {}
func (a *assetsImpl) RecordPoolQueueSize(size float64)                   {}
func (a *assetsImpl) IncreaseConsumePausedTime(seconds float64)          {}
func (a *assetsImpl) RecordDownloadDuration(durMillis float64, code int) {}
func (a *assetsImpl) RecordDownloadBytes(size float64)                   {}
func (a *assetsImpl) RecordUploadDuration(durMillis float64)             {}
func (a *assetsImpl) RecordStoredBytes(size float64, encoding string)    {}
func (a *assetsImpl) RecordAssetResolve(result string)                   {}
