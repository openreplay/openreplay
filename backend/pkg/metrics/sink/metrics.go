package sink

import (
	"github.com/prometheus/client_golang/prometheus"
	"openreplay/backend/pkg/metrics/common"
)

var sinkMessageSize = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "sink",
		Name:      "message_size_bytes",
		Help:      "A histogram displaying the size of each message in bytes.",
		Buckets:   common.DefaultSizeBuckets,
	},
)

func RecordMessageSize(size float64) {
	sinkMessageSize.Observe(size)
}

var sinkWrittenMessages = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "sink",
		Name:      "messages_written",
		Help:      "A counter displaying the total number of all written messages.",
	},
)

func IncreaseWrittenMessages() {
	sinkWrittenMessages.Inc()
}

var sinkTotalMessages = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "sink",
		Name:      "messages_total",
		Help:      "A counter displaying the total number of all processed messages.",
	},
)

func IncreaseTotalMessages() {
	sinkTotalMessages.Inc()
}

var sinkBatchSize = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "sink",
		Name:      "batch_size_bytes",
		Help:      "A histogram displaying the size of each batch in bytes.",
		Buckets:   common.DefaultSizeBuckets,
	},
)

func RecordBatchSize(size float64) {
	sinkBatchSize.Observe(size)
}

var sinkTotalBatches = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "sink",
		Name:      "batches_total",
		Help:      "A counter displaying the total number of all written batches.",
	},
)

func IncreaseTotalBatches() {
	sinkTotalBatches.Inc()
}

var sinkWrittenBytes = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "sink",
		Name:      "written_bytes",
		Help:      "A histogram displaying the size of buffer in bytes written to session file.",
		Buckets:   common.DefaultSizeBuckets,
	},
	[]string{"file_type"},
)

func RecordWrittenBytes(size float64, fileType string) {
	if size == 0 {
		return
	}
	sinkWrittenBytes.WithLabelValues(fileType).Observe(size)
	IncreaseTotalWrittenBytes(size, fileType)
}

var sinkTotalWrittenBytes = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Namespace: "sink",
		Name:      "written_bytes_total",
		Help:      "A counter displaying the total number of bytes written to all session files.",
	},
	[]string{"file_type"},
)

func IncreaseTotalWrittenBytes(size float64, fileType string) {
	if size == 0 {
		return
	}
	sinkTotalWrittenBytes.WithLabelValues(fileType).Add(size)
}

var sinkCachedAssets = prometheus.NewGauge(
	prometheus.GaugeOpts{
		Namespace: "sink",
		Name:      "assets_cached",
		Help:      "A gauge displaying the current number of cached assets.",
	},
)

func IncreaseCachedAssets() {
	sinkCachedAssets.Inc()
}

func DecreaseCachedAssets() {
	sinkCachedAssets.Dec()
}

var sinkSkippedAssets = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "sink",
		Name:      "assets_skipped",
		Help:      "A counter displaying the total number of all skipped assets.",
	},
)

func IncreaseSkippedAssets() {
	sinkSkippedAssets.Inc()
}

var sinkTotalAssets = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "sink",
		Name:      "assets_total",
		Help:      "A counter displaying the total number of all processed assets.",
	},
)

func IncreaseTotalAssets() {
	sinkTotalAssets.Inc()
}

var sinkAssetSize = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "sink",
		Name:      "asset_size_bytes",
		Help:      "A histogram displaying the size of each asset in bytes.",
		Buckets:   common.DefaultSizeBuckets,
	},
)

func RecordAssetSize(size float64) {
	sinkAssetSize.Observe(size)
}

var sinkProcessAssetDuration = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "sink",
		Name:      "asset_process_duration_seconds",
		Help:      "A histogram displaying the duration of processing for each asset in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
)

func RecordProcessAssetDuration(durMillis float64) {
	sinkProcessAssetDuration.Observe(durMillis / 1000.0)
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		sinkMessageSize,
		sinkWrittenMessages,
		sinkTotalMessages,
		sinkBatchSize,
		sinkTotalBatches,
		sinkWrittenBytes,
		sinkTotalWrittenBytes,
		sinkCachedAssets,
		sinkSkippedAssets,
		sinkTotalAssets,
		sinkAssetSize,
		sinkProcessAssetDuration,
	}
}
