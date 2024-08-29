package spot

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

var spotRequestSize = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "request_size_bytes",
		Help:      "A histogram displaying the size of each HTTP request in bytes.",
		Buckets:   common.DefaultSizeBuckets,
	},
	[]string{"url", "response_code"},
)

func RecordRequestSize(size float64, url string, code int) {
	spotRequestSize.WithLabelValues(url, strconv.Itoa(code)).Observe(size)
}

var spotRequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "request_duration_seconds",
		Help:      "A histogram displaying the duration of each HTTP request in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
	[]string{"url", "response_code"},
)

func RecordRequestDuration(durMillis float64, url string, code int) {
	spotRequestDuration.WithLabelValues(url, strconv.Itoa(code)).Observe(durMillis / 1000.0)
}

var spotTotalRequests = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "spot",
		Name:      "requests_total",
		Help:      "A counter displaying the number all HTTP requests.",
	},
)

func IncreaseTotalRequests() {
	spotTotalRequests.Inc()
}

var spotOriginalVideoSize = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "original_video_size_bytes",
		Help:      "A histogram displaying the size of each original video in bytes.",
		Buckets:   common.VideoSizeBuckets,
	},
)

func RecordOriginalVideoSize(size float64) {
	spotOriginalVideoSize.Observe(size)
}

var spotCroppedVideoSize = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "cropped_video_size_bytes",
		Help:      "A histogram displaying the size of each cropped video in bytes.",
		Buckets:   common.VideoSizeBuckets,
	},
)

func RecordCroppedVideoSize(size float64) {
	spotCroppedVideoSize.Observe(size)
}

var spotVideosTotal = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "spot",
		Name:      "videos_total",
		Help:      "A counter displaying the total number of all processed videos.",
	},
)

func IncreaseVideosTotal() {
	spotVideosTotal.Inc()
}

var spotVideosCropped = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "spot",
		Name:      "videos_cropped_total",
		Help:      "A counter displaying the total number of all cropped videos.",
	},
)

func IncreaseVideosCropped() {
	spotVideosCropped.Inc()
}

var spotVideosTranscoded = prometheus.NewCounter(
	prometheus.CounterOpts{
		Namespace: "spot",
		Name:      "videos_transcoded_total",
		Help:      "A counter displaying the total number of all transcoded videos.",
	},
)

func IncreaseVideosTranscoded() {
	spotVideosTranscoded.Inc()
}

var spotOriginalVideoDownloadDuration = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "original_video_download_duration_seconds",
		Help:      "A histogram displaying the duration of downloading each original video in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
)

func RecordOriginalVideoDownloadDuration(durMillis float64) {
	spotOriginalVideoDownloadDuration.Observe(durMillis / 1000.0)
}

var spotCroppingDuration = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "cropping_duration_seconds",
		Help:      "A histogram displaying the duration of cropping each video in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
)

func RecordCroppingDuration(durMillis float64) {
	spotCroppingDuration.Observe(durMillis / 1000.0)
}

var spotCroppedVideoUploadDuration = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "cropped_video_upload_duration_seconds",
		Help:      "A histogram displaying the duration of uploading each cropped video in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
)

func RecordCroppedVideoUploadDuration(durMillis float64) {
	spotCroppedVideoUploadDuration.Observe(durMillis / 1000.0)
}

var spotTranscodingDuration = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "transcoding_duration_seconds",
		Help:      "A histogram displaying the duration of transcoding each video in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
)

func RecordTranscodingDuration(durMillis float64) {
	spotTranscodingDuration.Observe(durMillis / 1000.0)
}

var spotTranscodedVideoUploadDuration = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "spot",
		Name:      "transcoded_video_upload_duration_seconds",
		Help:      "A histogram displaying the duration of uploading each transcoded video in seconds.",
		Buckets:   common.DefaultDurationBuckets,
	},
)

func RecordTranscodedVideoUploadDuration(durMillis float64) {
	spotTranscodedVideoUploadDuration.Observe(durMillis / 1000.0)
}

func List() []prometheus.Collector {
	return []prometheus.Collector{
		spotRequestSize,
		spotRequestDuration,
		spotTotalRequests,
		spotOriginalVideoSize,
		spotCroppedVideoSize,
		spotVideosTotal,
		spotVideosCropped,
		spotVideosTranscoded,
		spotOriginalVideoDownloadDuration,
		spotCroppingDuration,
		spotCroppedVideoUploadDuration,
		spotTranscodingDuration,
		spotTranscodedVideoUploadDuration,
	}
}
