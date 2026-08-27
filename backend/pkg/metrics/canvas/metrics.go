package canvas

import (
	"github.com/prometheus/client_golang/prometheus"
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

type canvasImpl struct{}

func New(serviceName string) Canvas { return &canvasImpl{} }

func (c *canvasImpl) List() []prometheus.Collector             { return []prometheus.Collector{} }
func (c *canvasImpl) RecordCanvasImageSize(size float64)       {}
func (c *canvasImpl) IncreaseFrames(outcome string)            {}
func (c *canvasImpl) RecordCanvasesPerSession(number float64)  {}
func (c *canvasImpl) RecordPreparingDuration(duration float64) {}
func (c *canvasImpl) IncreaseTriggerErrors()                   {}
func (c *canvasImpl) IncreaseUploads(outcome string)           {}
func (c *canvasImpl) RecordUploadingDuration(duration float64) {}
