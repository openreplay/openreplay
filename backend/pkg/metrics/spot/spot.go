package spot

import (
	"github.com/prometheus/client_golang/prometheus"
)

type Spot interface {
	RecordOriginalVideoSize(size float64)
	RecordCroppedVideoSize(size float64)
	IncreaseVideosTotal()
	IncreaseVideosCropped()
	IncreaseVideosTranscoded()
	RecordOriginalVideoDownloadDuration(durMillis float64)
	RecordCroppingDuration(durMillis float64)
	RecordCroppedVideoUploadDuration(durMillis float64)
	RecordTranscodingDuration(durMillis float64)
	RecordTranscodedVideoUploadDuration(durMillis float64)
	List() []prometheus.Collector
}

type spotImpl struct{}

func New(serviceName string) Spot { return &spotImpl{} }

func (s *spotImpl) List() []prometheus.Collector                          { return []prometheus.Collector{} }
func (s *spotImpl) RecordOriginalVideoSize(size float64)                  {}
func (s *spotImpl) RecordCroppedVideoSize(size float64)                   {}
func (s *spotImpl) IncreaseVideosTotal()                                  {}
func (s *spotImpl) IncreaseVideosCropped()                                {}
func (s *spotImpl) IncreaseVideosTranscoded()                             {}
func (s *spotImpl) RecordOriginalVideoDownloadDuration(durMillis float64) {}
func (s *spotImpl) RecordCroppingDuration(durMillis float64)              {}
func (s *spotImpl) RecordCroppedVideoUploadDuration(durMillis float64)    {}
func (s *spotImpl) RecordTranscodingDuration(durMillis float64)           {}
func (s *spotImpl) RecordTranscodedVideoUploadDuration(durMillis float64) {}
