package charts

import (
	"regexp"
	"strings"
	"testing"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
)

var placeholderRe = regexp.MustCompile(`@[a-zA-Z0-9_]+`)

// checkBindable asserts every @placeholder in the query text has a bound value.
func checkBindable(t *testing.T, query string, params map[string]any) {
	t.Helper()
	for _, m := range placeholderRe.FindAllString(query, -1) {
		name := strings.TrimPrefix(m, "@")
		if _, ok := params[name]; !ok {
			t.Errorf("placeholder %s has no bound parameter\nparams: %v\nquery: %s", m, params, query)
		}
	}
}

func bindCheckPayload() *Payload {
	filters := []model.Filter{
		{
			Name: "CLICK", IsEvent: true, Operator: "isAny", AutoCaptured: true,
			Filters: []model.Filter{{Name: "label", Operator: "contains", Value: []string{"buy @now", "100%"}}},
		},
		{Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true},
		{Name: "duration", Operator: "is", Value: []string{"1000", "60000"}, AutoCaptured: true},
		{Name: "metadata_3", Operator: "is", Value: []string{"prod's"}},
	}
	return &Payload{
		ProjectId: 42,
		UserId:    1,
		MetricPayload: &model.MetricPayload{
			StartTimestamp: 1700000000000,
			EndTimestamp:   1700604800000,
			Density:        7,
			Series: []model.Series{{
				Name:   "s1",
				Filter: model.FilterGroup{Filters: filters, EventsOrder: "and"},
			}},
		},
	}
}

func TestAllBuildersPlaceholdersBound(t *testing.T) {
	log := logger.New()

	p := bindCheckPayload()
	p.MetricPayload.MetricOf = "sessionCount"
	ts := &TimeSeriesQueryBuilder{Logger: log}
	q, params, err := ts.buildQuery(p, p.Series[0])
	if err != nil {
		t.Fatalf("timeseries: %v", err)
	}
	checkBindable(t, q, params)

	p = bindCheckPayload()
	f := &FunnelQueryBuilder{Logger: log}
	q, params, err = f.buildQuery(p)
	if err != nil {
		t.Fatalf("funnel: %v", err)
	}
	checkBindable(t, q, params)

	p = bindCheckPayload()
	p.MetricPayload.MetricOf = "userBrowser"
	tb := &TableQueryBuilder{Logger: log}
	q, params, err = tb.buildQuery(p)
	if err != nil {
		t.Fatalf("table: %v", err)
	}
	checkBindable(t, q, params)

	p = bindCheckPayload()
	te := &TableErrorsQueryBuilder{Logger: log}
	qs, params, err := te.buildQuery(p)
	if err != nil {
		t.Fatalf("table errors: %v", err)
	}
	for _, q := range qs {
		checkBindable(t, q, params)
	}

	p = bindCheckPayload()
	hm := &HeatmapQueryBuilder{Logger: log}
	q, params, err = hm.buildQuery(p)
	if err != nil {
		t.Fatalf("heatmap: %v", err)
	}
	checkBindable(t, q, params)
	q, params, err = hm.buildClickRageQuery(p)
	if err != nil {
		t.Fatalf("heatmap clickrage: %v", err)
	}
	checkBindable(t, q, params)

	p = bindCheckPayload()
	hs := &HeatmapSessionQueryBuilder{Logger: log}
	q, params, err = hs.buildQuery(p)
	if err != nil {
		t.Fatalf("heatmap session: %v", err)
	}
	checkBindable(t, q, params)

	p = bindCheckPayload()
	wv := WebVitalsQueryBuilder{Logger: log}
	q, params, err = wv.buildQuery(p)
	if err != nil {
		t.Fatalf("webvitals: %v", err)
	}
	checkBindable(t, q, params)

	p = bindCheckPayload()
	p.MetricPayload.MetricValue = []string{"location"}
	p.MetricPayload.StartPoint = []model.Filter{{Name: "LOCATION", IsEvent: true, Operator: "is", Value: []string{"/home"}, AutoCaptured: true}}
	p.MetricPayload.Exclude = []model.Filter{{Name: "location", Operator: "is", Value: []string{"/logout"}}}
	uj := &UserJourneyQueryBuilder{Logger: log}
	qs, params, err = uj.buildQuery(p)
	if err != nil {
		t.Fatalf("user journey: %v", err)
	}
	for _, q := range qs {
		checkBindable(t, q, params)
	}
}
