package web

import (
	"github.com/prometheus/client_golang/prometheus"
)

const (
	RejectEmptyBody           = "empty_body"
	RejectTooLarge            = "too_large"
	RejectBadJSON             = "bad_json"
	RejectTrackerOutdated     = "tracker_outdated"
	RejectNoProjectKey        = "no_project_key"
	RejectProjectNotFound     = "project_not_found"
	RejectProjectError        = "project_error"
	RejectPlatformUnsupported = "platform_unsupported"
	RejectBrowserUnrecognized = "browser_unrecognized"
	RejectSampleRateMiss      = "sample_rate_miss"
	RejectInternalError       = "internal_error"
)

type Web interface {
	RecordRequestSize(size float64, url string, code int)
	RecordRequestDuration(durMillis float64, url string, code int)
	IncreaseStartRejects(platform, reason string)
	List() []prometheus.Collector
}

type webImpl struct{}

func New(serviceName string) Web { return &webImpl{} }

func (w *webImpl) List() []prometheus.Collector                                  { return []prometheus.Collector{} }
func (w *webImpl) RecordRequestSize(size float64, url string, code int)          {}
func (w *webImpl) RecordRequestDuration(durMillis float64, url string, code int) {}
func (w *webImpl) IncreaseStartRejects(platform, reason string)                  {}
