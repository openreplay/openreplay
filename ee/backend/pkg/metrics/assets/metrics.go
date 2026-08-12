package assets

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
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

type assetsImpl struct {
	tasks                *prometheus.CounterVec
	throttled            prometheus.Counter
	retries              *prometheus.CounterVec
	terminalFailures     *prometheus.CounterVec
	retryQueueSize       prometheus.Gauge
	poolQueueSize        prometheus.Gauge
	consumePausedSeconds prometheus.Counter
	downloadDuration     *prometheus.HistogramVec
	downloadBytes        prometheus.Counter
	uploadDuration       prometheus.Histogram
	storedBytes          *prometheus.CounterVec
	resolves             *prometheus.CounterVec
}

func New(serviceName string) Assets {
	return &assetsImpl{
		tasks: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "tasks_total",
				Help:      "A counter displaying terminal outcomes of asset cache tasks (the task funnel).",
			},
			[]string{"outcome"},
		),
		throttled: prometheus.NewCounter(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "throttled_total",
				Help:      "A counter displaying per-host throttle deferrals (task re-scheduled, not a retry).",
			},
		),
		retries: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "retries_total",
				Help:      "A counter displaying scheduled asset download retries, by reason.",
			},
			[]string{"reason"},
		),
		terminalFailures: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "terminal_failures_total",
				Help:      "A counter displaying assets that permanently failed to cache, by reason.",
			},
			[]string{"reason"},
		),
		retryQueueSize: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace: serviceName,
				Name:      "retry_queue_size",
				Help:      "A gauge displaying the current number of pending asset download retries.",
			},
		),
		poolQueueSize: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Namespace: serviceName,
				Name:      "pool_queue_size",
				Help:      "A gauge displaying the current depth of the download worker pool queue.",
			},
		),
		consumePausedSeconds: prometheus.NewCounter(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "consume_paused_seconds_total",
				Help:      "A counter displaying total time message consumption was paused because the worker pool was full.",
			},
		),
		downloadDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: serviceName,
				Name:      "download_duration_seconds",
				Help:      "A histogram displaying the duration of downloading for each asset in seconds, by status class.",
				Buckets:   common.DefaultDurationBuckets,
			},
			[]string{"code_class"},
		),
		downloadBytes: prometheus.NewCounter(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "download_bytes_total",
				Help:      "A counter displaying total bytes downloaded from origins.",
			},
		),
		uploadDuration: prometheus.NewHistogram(
			prometheus.HistogramOpts{
				Namespace: serviceName,
				Name:      "upload_s3_duration_seconds",
				Help:      "A histogram displaying the duration of successful asset uploads to object storage in seconds.",
				Buckets:   common.DefaultDurationBuckets,
			},
		),
		storedBytes: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "stored_bytes_total",
				Help:      "A counter displaying total bytes written to object storage, by encoding.",
			},
			[]string{"encoding"},
		),
		resolves: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: serviceName,
				Name:      "resolver_lookups_total",
				Help:      "A counter displaying url→content-hash resolver lookups under the hash key scheme, by result.",
			},
			[]string{"result"},
		),
	}
}

func (a *assetsImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		a.tasks,
		a.throttled,
		a.retries,
		a.terminalFailures,
		a.retryQueueSize,
		a.poolQueueSize,
		a.consumePausedSeconds,
		a.downloadDuration,
		a.downloadBytes,
		a.uploadDuration,
		a.storedBytes,
		a.resolves,
	}
}

func (a *assetsImpl) IncreaseTasks(outcome string) {
	a.tasks.WithLabelValues(outcome).Inc()
}

func (a *assetsImpl) IncreaseThrottled() {
	a.throttled.Inc()
}

func (a *assetsImpl) IncreaseRetries(reason string) {
	a.retries.WithLabelValues(reason).Inc()
}

func (a *assetsImpl) IncreaseTerminalFailures(reason string) {
	a.terminalFailures.WithLabelValues(reason).Inc()
}

func (a *assetsImpl) RecordRetryQueueSize(size float64) {
	a.retryQueueSize.Set(size)
}

func (a *assetsImpl) RecordPoolQueueSize(size float64) {
	a.poolQueueSize.Set(size)
}

func (a *assetsImpl) IncreaseConsumePausedTime(seconds float64) {
	a.consumePausedSeconds.Add(seconds)
}

func (a *assetsImpl) RecordDownloadDuration(durMillis float64, code int) {
	class := "unknown"
	if code >= 100 && code < 600 {
		class = strconv.Itoa(code/100) + "xx"
	}
	a.downloadDuration.WithLabelValues(class).Observe(durMillis / 1000.0)
}

func (a *assetsImpl) RecordDownloadBytes(size float64) {
	a.downloadBytes.Add(size)
}

func (a *assetsImpl) RecordUploadDuration(durMillis float64) {
	a.uploadDuration.Observe(durMillis / 1000.0)
}

func (a *assetsImpl) RecordStoredBytes(size float64, encoding string) {
	a.storedBytes.WithLabelValues(encoding).Add(size)
}

func (a *assetsImpl) RecordAssetResolve(result string) {
	a.resolves.WithLabelValues(result).Inc()
}
