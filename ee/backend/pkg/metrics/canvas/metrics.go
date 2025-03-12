package canvas

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

type Canvas interface {
	RecordCanvasImageSize(size float64)
	IncreaseTotalSavedImages()
	RecordImagesPerCanvas(number float64)
	RecordCanvasesPerSession(number float64)
	RecordPreparingDuration(duration float64)
	IncreaseTotalCreatedArchives()
	RecordArchivingDuration(duration float64)
	RecordArchiveSize(size float64)
	RecordUploadingDuration(duration float64)
	List() []prometheus.Collector
}

type canvasImpl struct {
	canvasesImageSize            prometheus.Histogram
	canvasesTotalSavedImages     prometheus.Counter
	canvasesImagesPerCanvas      prometheus.Histogram
	canvasesCanvasesPerSession   prometheus.Histogram
	canvasesPreparingDuration    prometheus.Histogram
	canvasesTotalCreatedArchives prometheus.Counter
	canvasesArchivingDuration    prometheus.Histogram
	canvasesArchiveSize          prometheus.Histogram
	canvasesUploadingDuration    prometheus.Histogram
}

func New(serviceName string) Canvas {
	return &canvasImpl{
		canvasesImageSize:            newImageSizeMetric(serviceName),
		canvasesTotalSavedImages:     newTotalSavedImages(serviceName),
		canvasesImagesPerCanvas:      newImagesPerCanvas(serviceName),
		canvasesCanvasesPerSession:   newCanvasesPerSession(serviceName),
		canvasesPreparingDuration:    newPreparingDuration(serviceName),
		canvasesTotalCreatedArchives: newTotalCreatedArchives(serviceName),
		canvasesArchivingDuration:    newArchivingDuration(serviceName),
		canvasesArchiveSize:          newArchiveSize(serviceName),
		canvasesUploadingDuration:    newUploadingDuration(serviceName),
	}
}

func (c *canvasImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		c.canvasesImageSize,
		c.canvasesTotalSavedImages,
		c.canvasesImagesPerCanvas,
		c.canvasesCanvasesPerSession,
		c.canvasesPreparingDuration,
		c.canvasesTotalCreatedArchives,
		c.canvasesArchivingDuration,
		c.canvasesArchiveSize,
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

func newTotalSavedImages(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "total_saved_images",
			Help:      "A counter displaying the total number of saved images.",
		},
	)
}

func (c *canvasImpl) IncreaseTotalSavedImages() {
	c.canvasesTotalSavedImages.Inc()
}

func newImagesPerCanvas(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "images_per_canvas",
			Help:      "A histogram displaying the number of images per canvas.",
			Buckets:   common.DefaultBuckets,
		},
	)
}

func (c *canvasImpl) RecordImagesPerCanvas(number float64) {
	c.canvasesImagesPerCanvas.Observe(number)
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

func newTotalCreatedArchives(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "total_created_archives",
			Help:      "A counter displaying the total number of created canvas archives.",
		},
	)
}

func (c *canvasImpl) IncreaseTotalCreatedArchives() {
	c.canvasesTotalCreatedArchives.Inc()
}

func newArchivingDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "archiving_duration_seconds",
			Help:      "A histogram displaying the duration of archiving for each canvas in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (c *canvasImpl) RecordArchivingDuration(duration float64) {
	c.canvasesArchivingDuration.Observe(duration)
}

func newArchiveSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "archive_size_bytes",
			Help:      "A histogram displaying the size of each canvas archive in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
	)
}

func (c *canvasImpl) RecordArchiveSize(size float64) {
	c.canvasesArchiveSize.Observe(size)
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
