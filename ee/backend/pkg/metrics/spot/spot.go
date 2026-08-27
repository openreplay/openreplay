package spot

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
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

type spotImpl struct {
	spots             *prometheus.CounterVec
	taskFailures      *prometheus.CounterVec
	stageDuration     *prometheus.HistogramVec
	originalVideoSize prometheus.Histogram
	croppedVideoSize  prometheus.Histogram
}

func New(serviceName string) Spot {
	return &spotImpl{
		spots:             newSpots(serviceName),
		taskFailures:      newTaskFailures(serviceName),
		stageDuration:     newStageDuration(serviceName),
		originalVideoSize: newOriginalVideoSize(serviceName),
		croppedVideoSize:  newCroppedVideoSize(serviceName),
	}
}

func (s *spotImpl) List() []prometheus.Collector {
	return []prometheus.Collector{
		s.spots,
		s.taskFailures,
		s.stageDuration,
		s.originalVideoSize,
		s.croppedVideoSize,
	}
}

func newSpots(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "spots_total",
			Help:      "A counter displaying spot videos handled by the transcoder by outcome (processed/skipped/failed).",
		},
		[]string{"outcome"},
	)
}

func (s *spotImpl) IncreaseSpots(outcome string) {
	s.spots.WithLabelValues(outcome).Inc()
}

func newTaskFailures(serviceName string) *prometheus.CounterVec {
	return prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: serviceName,
			Name:      "task_failures_total",
			Help:      "A counter displaying failed transcoding tasks by pipeline stage (download/crop/crop_upload/transcode/upload/playlist).",
		},
		[]string{"stage"},
	)
}

func (s *spotImpl) IncreaseTaskFailures(stage string) {
	s.taskFailures.WithLabelValues(stage).Inc()
}

func newStageDuration(serviceName string) *prometheus.HistogramVec {
	return prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "stage_duration_seconds",
			Help:      "A histogram displaying the duration of each successful transcoding pipeline stage in seconds.",
			Buckets:   common.DefaultDurationBuckets,
		},
		[]string{"stage"},
	)
}

func (s *spotImpl) RecordStageDuration(durMillis float64, stage string) {
	s.stageDuration.WithLabelValues(stage).Observe(durMillis / 1000.0)
}

func newOriginalVideoSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "original_video_size_bytes",
			Help:      "A histogram displaying the size of each downloaded origin spot video in bytes.",
			Buckets:   common.VideoSizeBuckets,
		},
	)
}

func (s *spotImpl) RecordOriginalVideoSize(size float64) {
	s.originalVideoSize.Observe(size)
}

func newCroppedVideoSize(serviceName string) prometheus.Histogram {
	return prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Namespace: serviceName,
			Name:      "cropped_video_size_bytes",
			Help:      "A histogram displaying the size of each cropped spot video in bytes.",
			Buckets:   common.VideoSizeBuckets,
		},
	)
}

func (s *spotImpl) RecordCroppedVideoSize(size float64) {
	s.croppedVideoSize.Observe(size)
}
