package images

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

type Images interface {
	RecordOriginalArchiveSize(size float64)
	RecordOriginalArchiveExtractionDuration(duration float64)
	IncreaseTotalSavedArchives()
	RecordSavingImageDuration(duration float64)
	IncreaseTotalSavedImages()
	IncreaseTotalCreatedArchives()
	RecordArchivingDuration(duration float64)
	RecordArchiveSize(size float64)
	RecordUploadingDuration(duration float64)
	List() []prometheus.Collector
}

type imagesImpl struct {
	originalArchiveSize               prometheus.Histogram
	originalArchiveExtractionDuration prometheus.Histogram
	totalSavedArchives                prometheus.Counter
	savingImageDuration               prometheus.Histogram
	totalSavedImages                  prometheus.Counter
	totalCreatedArchives              prometheus.Counter
	archivingDuration                 prometheus.Histogram
	archiveSize                       prometheus.Histogram
	uploadingDuration                 prometheus.Histogram
}

func New(serviceName string) Images {
	return &imagesImpl{
		originalArchiveSize:               newOriginalArchiveSize(serviceName),
		originalArchiveExtractionDuration: newOriginalArchiveExtractionDuration(serviceName),
		totalSavedArchives:                newTotalSavedArchives(serviceName),
		savingImageDuration:               newSavingImageDuration(serviceName),
		totalSavedImages:                  newTotalSavedImages(serviceName),
		totalCreatedArchives:              newTotalCreatedArchives(serviceName),
		archivingDuration:                 newArchivingDuration(serviceName),
		archiveSize:                       newArchiveSize(serviceName),
		uploadingDuration:                 newUploadingDuration(serviceName),
	}
}

func (i *imagesImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		i.originalArchiveSize,
		i.originalArchiveExtractionDuration,
		i.totalSavedArchives,
		i.savingImageDuration,
		i.totalSavedImages,
		i.totalCreatedArchives,
		i.archivingDuration,
		i.archiveSize,
		i.uploadingDuration,
	}
}

func newOriginalArchiveSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "original_archive_size_bytes",
			Help:      "A histogram displaying the original archive size in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
	)
}

func (i *imagesImpl) RecordOriginalArchiveSize(size float64) {
	i.archiveSize.Observe(size)
}

func newOriginalArchiveExtractionDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "original_archive_extraction_duration_seconds",
			Help:      "A histogram displaying the duration of extracting the original archive.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (i *imagesImpl) RecordOriginalArchiveExtractionDuration(duration float64) {
	i.originalArchiveExtractionDuration.Observe(duration)
}

func newTotalSavedArchives(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "total_saved_archives",
			Help:      "A counter displaying the total number of saved original archives.",
		},
	)
}

func (i *imagesImpl) IncreaseTotalSavedArchives() {
	i.totalSavedArchives.Inc()
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

func newTotalSavedImages(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "total_saved_images",
			Help:      "A counter displaying the total number of saved images.",
		},
	)
}

func (i *imagesImpl) IncreaseTotalSavedImages() {
	i.totalSavedImages.Inc()
}

func newTotalCreatedArchives(serviceName string) prometheus.Counter {
	return prometheus.NewCounter(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "total_created_archives",
			Help:      "A counter displaying the total number of created archives.",
		},
	)
}

func (i *imagesImpl) IncreaseTotalCreatedArchives() {
	i.totalCreatedArchives.Inc()
}

func newArchivingDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "archiving_duration_seconds",
			Help:      "A histogram displaying the duration of archiving each session in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (i *imagesImpl) RecordArchivingDuration(duration float64) {
	i.archivingDuration.Observe(duration)
}

func newArchiveSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "archive_size_bytes",
			Help:      "A histogram displaying the session's archive size in bytes.",
			Buckets:   common.DefaultSizeBuckets,
		},
	)
}

func (i *imagesImpl) RecordArchiveSize(size float64) {
	i.archiveSize.Observe(size)
}

func newUploadingDuration(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "uploading_duration_seconds",
			Help:      "A histogram displaying the duration of uploading each session's archive to S3 in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
	)
}

func (i *imagesImpl) RecordUploadingDuration(duration float64) {
	i.uploadingDuration.Observe(duration)
}
