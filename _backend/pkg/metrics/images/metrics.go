package images

import (
	"github.com/prometheus/client_golang/prometheus"
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

type imagesImpl struct{}

func New(serviceName string) Images { return &imagesImpl{} }

func (i *imagesImpl) List() []prometheus.Collector                             { return []prometheus.Collector{} }
func (i *imagesImpl) RecordOriginalArchiveSize(size float64)                   {}
func (i *imagesImpl) RecordOriginalArchiveExtractionDuration(duration float64) {}
func (i *imagesImpl) IncreaseTotalSavedArchives()                              {}
func (i *imagesImpl) RecordSavingImageDuration(duration float64)               {}
func (i *imagesImpl) IncreaseTotalSavedImages()                                {}
func (i *imagesImpl) IncreaseTotalCreatedArchives()                            {}
func (i *imagesImpl) RecordArchivingDuration(duration float64)                 {}
func (i *imagesImpl) RecordArchiveSize(size float64)                           {}
func (i *imagesImpl) RecordUploadingDuration(duration float64)                 {}
