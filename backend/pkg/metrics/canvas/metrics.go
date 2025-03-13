package canvas

import (
	"github.com/prometheus/client_golang/prometheus"
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

type canvasImpl struct{}

func New(serviceName string) Canvas { return &canvasImpl{} }

func (c *canvasImpl) List() []prometheus.Collector             { return []prometheus.Collector{} }
func (c *canvasImpl) RecordCanvasImageSize(size float64)       {}
func (c *canvasImpl) IncreaseTotalSavedImages()                {}
func (c *canvasImpl) RecordImagesPerCanvas(number float64)     {}
func (c *canvasImpl) RecordCanvasesPerSession(number float64)  {}
func (c *canvasImpl) RecordPreparingDuration(duration float64) {}
func (c *canvasImpl) IncreaseTotalCreatedArchives()            {}
func (c *canvasImpl) RecordArchivingDuration(duration float64) {}
func (c *canvasImpl) RecordArchiveSize(size float64)           {}
func (c *canvasImpl) RecordUploadingDuration(duration float64) {}
