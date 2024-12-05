package analytics

import (
	"github.com/prometheus/client_golang/prometheus"

	"openreplay/backend/pkg/metrics/common"
)

var cardCreated = prometheus.NewHistogram(
	prometheus.HistogramOpts{
		Namespace: "card",
		Name:      "created",
		Help:      "Histogram for tracking card creation",
		Buckets:   common.DefaultBuckets,
	},
)

func List() []prometheus.Collector {
	return []prometheus.Collector{
		cardCreated,
	}
}
