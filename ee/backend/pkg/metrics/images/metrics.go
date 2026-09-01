package images

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

const (
	FrameSaved      = "saved"
	FrameBadMessage = "bad_message"
	UploadOK        = "uploaded"
	UploadMissing   = "missing"
)

type Images interface {
	RecordSavingImageDuration(duration float64)
	IncreaseFrames(outcome string)
	IncreaseUploads(outcome string)
	RecordUploadingDuration(duration float64)
	List() []prometheus.Collector
}

type imagesImpl struct {
	savingImageDuration prometheus.Histogram
	frames              *prometheus.CounterVec
	uploads             *prometheus.CounterVec
	uploadingDuration   prometheus.Histogram
}

func New(serviceName string) Images {
	return &imagesImpl{
		savingImageDuration: newSavingImageDuration(serviceName),
		frames:              newFrames(serviceName),
		uploads:             newUploads(serviceName),
		uploadingDuration:   newUploadingDuration(serviceName),
	}
}

func (i *imagesImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		i.savingImageDuration,
		i.frames,
		i.uploads,
		i.uploadingDuration,
	}
}

func newSavingImageDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "saving_image_duration_seconds",
			Help:      "A histogram displaying the duration of saving each image in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (i *imagesImpl) RecordSavingImageDuration(duration float64) {
	i.savingImageDuration.Observe(duration)
}

func newFrames(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "frames_total",
			Help:      "A counter displaying consumed screenshot frames by outcome (saved/bad_message).",
		},
		[]string{"outcome"},
	)
}

func (i *imagesImpl) IncreaseFrames(outcome string) {
	i.frames.WithLabelValues(outcome).Inc()
}

func newUploads(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "uploads_total",
			Help:      "A counter displaying screenshot archive uploads by outcome (uploaded/missing).",
		},
		[]string{"outcome"},
	)
}

func (i *imagesImpl) IncreaseUploads(outcome string) {
	i.uploads.WithLabelValues(outcome).Inc()
}

func newUploadingDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "uploading_duration_seconds",
			Help:      "A histogram displaying the wall-clock duration of streaming-archive upload to S3 in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (i *imagesImpl) RecordUploadingDuration(duration float64) {
	i.uploadingDuration.Observe(duration)
}
