package metrics

import (
	"context"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"openreplay/backend/pkg/logger"
)

type MetricServer struct {
	registry *prometheus.Registry
}

func New(log logger.Logger, cs []prometheus.Collector) {
	registry := prometheus.NewRegistry()
	// Add go runtime metrics and process collectors.
	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)
	// Add extra metrics
	registry.MustRegister(cs...)
	// Expose /metrics HTTP endpoint using the created custom registry.
	http.Handle(
		"/metrics", promhttp.HandlerFor(
			registry,
			promhttp.HandlerOpts{
				EnableOpenMetrics: true,
			}),
	)
	go func() {
		log.Error(context.Background(), "%v", http.ListenAndServe(":8888", nil))
	}()
}
