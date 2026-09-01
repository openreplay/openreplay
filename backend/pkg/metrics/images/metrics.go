package images

import (
	"github.com/prometheus/client_golang/prometheus"
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

type imagesImpl struct{}

func New(serviceName string) Images { return &imagesImpl{} }

func (i *imagesImpl) List() []prometheus.Collector               { return []prometheus.Collector{} }
func (i *imagesImpl) RecordSavingImageDuration(duration float64) {}
func (i *imagesImpl) IncreaseFrames(outcome string)              {}
func (i *imagesImpl) IncreaseUploads(outcome string)             {}
func (i *imagesImpl) RecordUploadingDuration(duration float64)   {}
