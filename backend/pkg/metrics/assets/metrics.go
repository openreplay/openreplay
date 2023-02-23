package assets

import (
	"github.com/prometheus/client_golang/prometheus"
	"openreplay/backend/pkg/metrics/common"
	"strconv"
)

var assetsProcessedSessions = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "assets",
		Name:      "processed_total",
		Help:      "A counter displaying the total count of processed assets.",
	},
)

func IncreaseProcessesSessions() {
	assetsProcessedSessions.Inc()
}

var assetsSavedSessions = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "assets",
		Name:      "saved_total",
		Help:      "A counter displaying the total number of cached assets.",
	},
)

func IncreaseSavedSessions() {
	assetsSavedSessions.Inc()
}

var assetsDownloadDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "assets",
		Name:      "download_duration_seconds",
		Help:      "A histogram displaying the duration of downloading for each asset in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"response_code"},
)

func RecordDownloadDuration(durMillis float64, code int) {
	assetsDownloadDuration.WithLabelValues(strconv.Itoa(code)).Observe(durMillis / 1000.0)
}

var assetsUploadDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "assets",
		Name:      "upload_s3_duration_seconds",
		Help:      "A histogram displaying the duration of uploading to s3 for each asset in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"failed"},
)

func RecordUploadDuration(durMillis float64, isFailed bool) {
	failed := "false"
	if isFailed {
		failed = "true"
	}
	assetsUploadDuration.WithLabelValues(failed).Observe(durMillis / 1000.0)
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		assetsProcessedSessions,
		assetsSavedSessions,
		assetsDownloadDuration,
		assetsUploadDuration,
	}
}
