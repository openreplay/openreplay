package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"openreplay/backend/pkg/logger"
)

type MetricServer struct{}

func New(log logger.Logger, cs []prometheus.Collector) {}
