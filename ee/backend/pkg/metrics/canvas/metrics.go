package canvas

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

type Canvas interface {
	RecordCanvasImageSize(size float64)
	IncreaseFrames(outcome string)
	RecordCanvasesPerSession(number float64)
	RecordPreparingDuration(duration float64)
	IncreaseTriggerErrors()
	IncreaseUploads(outcome string)
	RecordUploadingDuration(duration float64)
	List() []prometheus.Collector
}

type canvasImpl struct {
	canvasesImageSize          prometheus.Histogram
	frames                     *prometheus.CounterVec
	canvasesCanvasesPerSession prometheus.Histogram
	canvasesPreparingDuration  prometheus.Histogram
	triggerErrors              prometheus.Counter
	uploads                    *prometheus.CounterVec
	canvasesUploadingDuration  prometheus.Histogram
}

func New(serviceName string) Canvas {
	return &canvasImpl{
		canvasesImageSize:          newImageSizeMetric(serviceName),
		frames:                     newFrames(serviceName),
		canvasesCanvasesPerSession: newCanvasesPerSession(serviceName),
		canvasesPreparingDuration:  newPreparingDuration(serviceName),
		triggerErrors:              newTriggerErrors(serviceName),
		uploads:                    newUploads(serviceName),
		canvasesUploadingDuration:  newUploadingDuration(serviceName),
	}
}

func (c *canvasImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		c.canvasesImageSize,
		c.frames,
		c.canvasesCanvasesPerSession,
		c.canvasesPreparingDuration,
		c.triggerErrors,
		c.uploads,
		c.canvasesUploadingDuration,
	}
}

func newImageSizeMetric(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "image_size_bytes",
			Help:      "A histogram displaying the size of each canvas image in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
	)
}

func (c *canvasImpl) RecordCanvasImageSize(size float64) {
	c.canvasesImageSize.Observe(size)
}

func newFrames(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "frames_total",
			Help:      "A counter displaying consumed canvas frames by outcome (saved/bad_message).",
		},
		[]string{"outcome"},
	)
}

func (c *canvasImpl) IncreaseFrames(outcome string) {
	c.frames.WithLabelValues(outcome).Inc()
}

func newCanvasesPerSession(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "canvases_per_session",
			Help:      "A histogram displaying the number of canvases per session.",
			Buckets:   common.DefaultBuckets,
		},
	)
}

func (c *canvasImpl) RecordCanvasesPerSession(number float64) {
	c.canvasesCanvasesPerSession.Observe(number)
}

func newPreparingDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "preparing_duration_seconds",
			Help:      "A histogram displaying the duration of preparing the list of canvases for each session in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (c *canvasImpl) RecordPreparingDuration(duration float64) {
	c.canvasesPreparingDuration.Observe(duration)
}

func newTriggerErrors(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "trigger_produce_errors_total",
			Help:      "A counter displaying failures to produce a canvas pack trigger (the canvas is never archived).",
		},
	)
}

func (c *canvasImpl) IncreaseTriggerErrors() {
	c.triggerErrors.Inc()
}

func newUploads(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "uploads_total",
			Help:      "A counter displaying canvas archive uploads by outcome (uploaded/missing).",
		},
		[]string{"outcome"},
	)
}

func (c *canvasImpl) IncreaseUploads(outcome string) {
	c.uploads.WithLabelValues(outcome).Inc()
}

func newUploadingDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "uploading_duration_seconds",
			Help:      "A histogram displaying the duration of uploading for each canvas in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (c *canvasImpl) RecordUploadingDuration(duration float64) {
	c.canvasesUploadingDuration.Observe(duration)
}
