package charts

import (
	"fmt"
	"testing"

	"github.com/go-playground/validator/v10"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
)

func TestScrollmapHistogramQuery(t *testing.T) {
	sm := &ScrollmapQueryBuilder{Logger: logger.New()}
	p := heatmapPayload("/pricing")
	p.MetricPayload.SampleRate = 20
	q, params, err := sm.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	checkBindable(t, q, params)
	mustContain(t, q,
		"e.`$event_name` = 'SCROLL'",
		"e.`$auto_captured`",
		`accurateCastOrNull(e."$properties".depth_pct, 'UInt8')`,
		// a zero fold isn't stored, so missing reads as 0, not as the whole page
		`ifNull(accurateCastOrNull(e."$properties".fold_pct, 'UInt8'), 0)`,
		// one count per session, at its deepest page view
		"max(d) AS depth",
		"argMax(f, d) AS fold",
		"GROUP BY e.session_id",
		"count() AS sessions",
		"median(fold)",
		"sumMap([depth], [toUInt64(1)]).1 AS depths",
		"sumMap([depth], [toUInt64(1)]).2 AS counts",
		`e."$current_path"`,
		"e.sample_key < @sampleRate",
		"e.session_id IN (SELECT DISTINCT l.session_id",
	)
	mustNotContain(t, q, "'CLICK'", "normalized_x")
}

func TestScrollmapRouting(t *testing.T) {
	for metricOf, want := range map[string]string{
		MetricOfScrollMap: "*charts.ScrollmapQueryBuilder",
		"heatMapUrl":      "*charts.HeatmapQueryBuilder",
	} {
		p := heatmapPayload("/pricing")
		p.MetricType = MetricTypeSession
		p.MetricOf = metricOf
		qb, err := NewQueryBuilder(logger.New(), p, nil)
		if err != nil {
			t.Fatal(err)
		}
		if got := fmt.Sprintf("%T", qb); got != want {
			t.Errorf("metricOf %s: got %s, want %s", metricOf, got, want)
		}
	}
}

func TestHeatmapSessionScrollMode(t *testing.T) {
	hs := &HeatmapSessionQueryBuilder{Logger: logger.New()}
	for _, path := range []string{"/pricing", ""} {
		p := heatmapPayload(path)
		p.MetricOf = MetricOfScrollMap
		q, params, err := hs.buildQuery(p)
		if err != nil {
			t.Fatal(err)
		}
		checkBindable(t, q, params)
		mustContain(t, q, "e.`$event_name` = 'SCROLL'", "e.`$auto_captured`")
		mustNotContain(t, q, "'CLICK'")
	}
}

func TestScrollMapUrlIsAHeatmapMetric(t *testing.T) {
	v := validator.New()
	v.RegisterStructValidation(model.ValidateMetricFields, model.MetricPayload{})
	for _, c := range []struct {
		metricType, metricOf string
		ok                   bool
	}{
		{"heatMap", "scrollMapUrl", true},
		{"heatmaps_session", "scrollMapUrl", true},
		{"heatMap", "heatMapUrl", true},
		{"heatMap", "webVitalUrl", false},
		{"table", "scrollMapUrl", false},
	} {
		err := v.Struct(model.MetricPayload{MetricType: model.MetricType(c.metricType), MetricOf: c.metricOf})
		rejected := false
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fe := range errs {
				if fe.Field() == "MetricOf" || fe.Field() == "metricOf" {
					rejected = true
				}
			}
		}
		if rejected == c.ok {
			t.Errorf("%s/%s: metricOf rejected = %v, want %v (%v)", c.metricType, c.metricOf, rejected, !c.ok, err)
		}
	}
}
