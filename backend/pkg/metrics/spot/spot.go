package spot

import (
	"github.com/prometheus/client_golang/prometheus"
)

const (
	SpotProcessed   = "processed"
	SpotSkipped     = "skipped"
	SpotFailed      = "failed"
	StageDownload   = "download"
	StageCrop       = "crop"
	StageCropUpload = "crop_upload"
	StageTranscode  = "transcode"
	StageUpload     = "upload"
	StagePlaylist   = "playlist"
)

type Spot interface {
	IncreaseSpots(outcome string)
	IncreaseTaskFailures(stage string)
	RecordStageDuration(durMillis float64, stage string)
	RecordOriginalVideoSize(size float64)
	RecordCroppedVideoSize(size float64)
	List() []prometheus.Collector
}

type spotImpl struct{}

func New(serviceName string) Spot { return &spotImpl{} }

func (s *spotImpl) List() []prometheus.Collector                        { return []prometheus.Collector{} }
func (s *spotImpl) IncreaseSpots(outcome string)                        {}
func (s *spotImpl) IncreaseTaskFailures(stage string)                   {}
func (s *spotImpl) RecordStageDuration(durMillis float64, stage string) {}
func (s *spotImpl) RecordOriginalVideoSize(size float64)                {}
func (s *spotImpl) RecordCroppedVideoSize(size float64)                 {}
