package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"log"
	"net/http"
)

type MetricServer struct {
	registry *prometheus.Registry
}

func New() *MetricServer {
	registry := prometheus.NewRegistry()
	// Add go runtime metrics and process collectors.
	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)
	// Expose /metrics HTTP endpoint using the created custom registry.
	http.Handle(
		"/metrics", promhttp.HandlerFor(
			registry,
			promhttp.HandlerOpts{
				EnableOpenMetrics: true,
			}),
	)
	go func() {
		log.Println(http.ListenAndServe(":8888", nil))
	}()
	return &MetricServer{
		registry: registry,
	}
}

func (s *MetricServer) Register(cs []prometheus.Collector) {
	s.registry.MustRegister(cs...)
}
