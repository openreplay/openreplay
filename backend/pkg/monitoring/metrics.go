package monitoring

import (
	"fmt"
	"log"
	"net/http"

	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/metric/global"
	"go.opentelemetry.io/otel/metric/instrument/syncfloat64"
	"go.opentelemetry.io/otel/sdk/metric/aggregator/histogram"
	controller "go.opentelemetry.io/otel/sdk/metric/controller/basic"
	"go.opentelemetry.io/otel/sdk/metric/export/aggregation"
	processor "go.opentelemetry.io/otel/sdk/metric/processor/basic"
	selector "go.opentelemetry.io/otel/sdk/metric/selector/simple"
)

// Metrics stores all collected metrics
type Metrics struct {
	meter          metric.Meter
	counters       map[string]syncfloat64.Counter
	upDownCounters map[string]syncfloat64.UpDownCounter
	histograms     map[string]syncfloat64.Histogram
}

func New(name string) *Metrics {
	m := &Metrics{
		counters:       make(map[string]syncfloat64.Counter),
		upDownCounters: make(map[string]syncfloat64.UpDownCounter),
		histograms:     make(map[string]syncfloat64.Histogram),
	}
	m.initPrometheusDataExporter()
	m.initMetrics(name)
	return m
}

// initPrometheusDataExporter allows to use collected metrics in prometheus
func (m *Metrics) initPrometheusDataExporter() {
	config := prometheus.Config{
		DefaultHistogramBoundaries: []float64{1, 2, 5, 10, 20, 50, 100, 250, 500, 1000},
	}
	c := controller.New(
		processor.NewFactory(
			selector.NewWithHistogramDistribution(
				histogram.WithExplicitBoundaries(config.DefaultHistogramBoundaries),
			),
			aggregation.CumulativeTemporalitySelector(),
			processor.WithMemory(true),
		),
	)
	exporter, err := prometheus.New(config, c)
	if err != nil {
		log.Panicf("failed to initialize prometheus exporter %v", err)
	}

	global.SetMeterProvider(exporter.MeterProvider())

	http.HandleFunc("/metrics", exporter.ServeHTTP)
	go func() {
		_ = http.ListenAndServe(":8888", nil)
	}()

	fmt.Println("Prometheus server running on :8888")
}

func (m *Metrics) initMetrics(name string) {
	m.meter = global.Meter(name)
}

/*
Counter is a synchronous instrument that measures additive non-decreasing values, for example, the number of:
- processed requests
- received bytes
- disk reads
*/

func (m *Metrics) RegisterCounter(name string) (syncfloat64.Counter, error) {
	if counter, ok := m.counters[name]; ok {
		return counter, nil
	}
	counter, err := m.meter.SyncFloat64().Counter(name)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize counter: %v", err)
	}
	m.counters[name] = counter
	return counter, nil
}

func (m *Metrics) GetCounter(name string) syncfloat64.Counter {
	return m.counters[name]
}

/*
UpDownCounter is a synchronous instrument which measures additive values that increase or decrease with time,
for example, the number of:
- active requests
- open connections
- memory in use (megabytes)
*/

func (m *Metrics) RegisterUpDownCounter(name string) (syncfloat64.UpDownCounter, error) {
	if counter, ok := m.upDownCounters[name]; ok {
		return counter, nil
	}
	counter, err := m.meter.SyncFloat64().UpDownCounter(name)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize upDownCounter: %v", err)
	}
	m.upDownCounters[name] = counter
	return counter, nil
}

func (m *Metrics) GetUpDownCounter(name string) syncfloat64.UpDownCounter {
	return m.upDownCounters[name]
}

/*
Histogram is a synchronous instrument that produces a histogram from recorded values, for example:
- request latency
- request size
*/

func (m *Metrics) RegisterHistogram(name string) (syncfloat64.Histogram, error) {
	if hist, ok := m.histograms[name]; ok {
		return hist, nil
	}
	hist, err := m.meter.SyncFloat64().Histogram(name)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize histogram: %v", err)
	}
	m.histograms[name] = hist
	return hist, nil
}

func (m *Metrics) GetHistogram(name string) syncfloat64.Histogram {
	return m.histograms[name]
}
