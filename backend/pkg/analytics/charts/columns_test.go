package charts

import (
	"strings"
	"testing"

	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/logger"
)

func TestSplitSessionFilters(t *testing.T) {
	onEvents, sessionOnly := SplitSessionFilters([]model.Filter{
		{Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true},
		{Name: "user_country", Operator: "is", Value: []string{"FR"}},
		{Name: "platform", Operator: "is", Value: []string{"web"}, AutoCaptured: true},
		{Name: "userDevice", Operator: "is", Value: []string{"iPhone"}, AutoCaptured: true},
		{Name: "duration", Operator: "is", Value: []string{"1000"}, AutoCaptured: true},
		{Name: "metadata_2", Operator: "is", Value: []string{"x"}, AutoCaptured: true},
	})

	if len(onEvents) != 2 {
		t.Fatalf("expected 2 filters on events, got %d: %v", len(onEvents), onEvents)
	}
	if onEvents[0].Name != "userBrowser" || onEvents[1].Name != "user_country" {
		t.Errorf("unexpected onEvents filters: %v", onEvents)
	}
	if len(sessionOnly) != 4 {
		t.Fatalf("expected 4 session-only filters, got %d: %v", len(sessionOnly), sessionOnly)
	}
}

func TestBuildSessionConditionsOnEvents(t *testing.T) {
	qp := NewParams()
	conds := BuildSessionConditionsOnEvents([]model.Filter{
		{Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true},
	}, "e", qp)

	if len(conds) != 1 {
		t.Fatalf("expected 1 condition, got %v", conds)
	}
	if conds[0] != `e."$browser" = @p1` {
		t.Errorf(`expected e."$browser" = @p1, got %q`, conds[0])
	}
	if qp.Values()["p1"] != "Chrome" {
		t.Errorf("expected bound value Chrome, got %v", qp.Values())
	}
}

func TestBuildWherePreferEventColumns(t *testing.T) {
	filters := []model.Filter{
		{Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true},
		{Name: "platform", Operator: "is", Value: []string{"web"}, AutoCaptured: true},
	}

	// Default: both session filters are rendered on the sessions alias.
	_, eventFilters, _, sessionFilters := BuildWhere(filters, "and", "e", "s", NewParams())
	if len(eventFilters) != 0 || len(sessionFilters) != 2 {
		t.Fatalf("default mode: expected 0/2, got %v / %v", eventFilters, sessionFilters)
	}

	// preferEventColumns: userBrowser moves to the events alias, platform
	// (session-only) stays on sessions.
	_, eventFilters, _, sessionFilters = BuildWhere(filters, "and", "e", "s", NewParams(), true)
	if len(eventFilters) != 1 || !strings.Contains(eventFilters[0], `e."$browser"`) {
		t.Fatalf("preferEventColumns: expected browser condition on events alias, got %v", eventFilters)
	}
	if len(sessionFilters) != 1 || !strings.Contains(sessionFilters[0], "s.platform") {
		t.Fatalf("preferEventColumns: expected platform on sessions alias, got %v", sessionFilters)
	}
}

func journeyPayload(filters []model.Filter) *Payload {
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

// A card that filters on an attribute present in both tables must not join
// experimental.sessions; one that filters on a session-only attribute must.
func TestFunnelSessionsJoinOnlyWhenNeeded(t *testing.T) {
	base := []model.Filter{
		{Name: "CLICK", IsEvent: true, Operator: "isAny", AutoCaptured: true, PropertyOrder: "and"},
		{Name: "LOCATION", IsEvent: true, Operator: "isAny", AutoCaptured: true, PropertyOrder: "and"},
	}

	p := journeyPayload(append(base, model.Filter{Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true}))
	f := &FunnelQueryBuilder{Logger: logger.New()}
	q, _, err := f.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(q, "experimental.sessions") {
		t.Errorf("browser filter must run on the events table, query joins sessions:\n%s", q)
	}
	if !strings.Contains(q, `e."$browser"`) {
		t.Errorf("browser filter missing from events conditions:\n%s", q)
	}

	p = journeyPayload(append(base, model.Filter{Name: "platform", Operator: "is", Value: []string{"web"}, AutoCaptured: true}))
	q, _, err = f.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(q, "experimental.sessions") {
		t.Errorf("platform is session-only, query must join sessions:\n%s", q)
	}
}

func TestFunnelUserCountUsesEventsUserId(t *testing.T) {
	p := journeyPayload([]model.Filter{
		{Name: "CLICK", IsEvent: true, Operator: "isAny", AutoCaptured: true, PropertyOrder: "and"},
		{Name: "LOCATION", IsEvent: true, Operator: "isAny", AutoCaptured: true, PropertyOrder: "and"},
	})
	p.MetricPayload.MetricFormat = MetricFormatUserCount

	f := &FunnelQueryBuilder{Logger: logger.New()}
	q, _, err := f.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(q, "experimental.sessions") {
		t.Errorf("userCount funnel should not join sessions:\n%s", q)
	}
	if !strings.Contains(q, `GROUP BY e."$user_id"`) {
		t.Errorf("userCount funnel should group by the events user id:\n%s", q)
	}
}

func TestTimeseriesSessionsJoinOnlyWhenNeeded(t *testing.T) {
	ts := &TimeSeriesQueryBuilder{Logger: logger.New()}
	event := model.Filter{Name: "CLICK", IsEvent: true, Operator: "isAny", AutoCaptured: true, PropertyOrder: "and"}

	p := journeyPayload([]model.Filter{event, {Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true}})
	p.MetricPayload.MetricOf = MetricSessionCount
	q, _, err := ts.buildQuery(p, p.Series[0])
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(q, "experimental.sessions") {
		t.Errorf("browser filter must run on the events table, query joins sessions:\n%s", q)
	}
	if !strings.Contains(q, `main."$browser"`) {
		t.Errorf("browser filter missing from events conditions:\n%s", q)
	}

	p = journeyPayload([]model.Filter{event, {Name: "duration", Operator: "is", Value: []string{"1000"}, AutoCaptured: true}})
	p.MetricPayload.MetricOf = MetricSessionCount
	q, _, err = ts.buildQuery(p, p.Series[0])
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(q, "experimental.sessions") {
		t.Errorf("duration is session-only, query must join sessions:\n%s", q)
	}
}

func TestTableSessionsJoinOnlyWhenNeeded(t *testing.T) {
	tb := &TableQueryBuilder{Logger: logger.New()}
	event := model.Filter{Name: "CLICK", IsEvent: true, Operator: "isAny", AutoCaptured: true, PropertyOrder: "and"}

	// Metric with an events equivalent + event filter: events table only.
	p := journeyPayload([]model.Filter{event, {Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true}})
	p.MetricPayload.MetricOf = string(MetricOfTableCountry)
	q, _, err := tb.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(q, "experimental.sessions") {
		t.Errorf("country metric with events filters should not join sessions:\n%s", q)
	}
	if !strings.Contains(q, "toString(`$country`) AS metric_value") {
		t.Errorf("metric value should come from the events table:\n%s", q)
	}
	if !strings.Contains(q, `main."$browser"`) {
		t.Errorf("browser filter must be applied on the events table:\n%s", q)
	}

	// Session-only metric (userDevice) keeps the sessions table.
	p = journeyPayload([]model.Filter{event})
	p.MetricPayload.MetricOf = string(MetricOfTableDevice)
	q, _, err = tb.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(q, "experimental.sessions") {
		t.Errorf("userDevice has no events equivalent, sessions table required:\n%s", q)
	}

	// No event filters at all: sessions table only (no events scan).
	p = journeyPayload([]model.Filter{{Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true}})
	p.MetricPayload.MetricOf = string(MetricOfTableBrowser)
	q, _, err = tb.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(q, "product_analytics.events") {
		t.Errorf("without event filters the query should stay on sessions:\n%s", q)
	}
	if !strings.Contains(q, "s.user_browser") {
		t.Errorf("browser filter must stay on the sessions table:\n%s", q)
	}
}

// A single session filter used to be silently dropped by the old
// "len(sessionsWhere) > 4" threshold; it must now be applied.
func TestWebVitalsSessionFilterNotDropped(t *testing.T) {
	wv := WebVitalsQueryBuilder{Logger: logger.New()}

	p := journeyPayload([]model.Filter{{Name: "userBrowser", Operator: "is", Value: []string{"Chrome"}, AutoCaptured: true}})
	q, _, err := wv.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(q, "experimental.sessions") {
		t.Errorf("browser filter must run on the events table, query joins sessions:\n%s", q)
	}
	if !strings.Contains(q, `"$browser"`) {
		t.Errorf("browser filter was dropped:\n%s", q)
	}

	p = journeyPayload([]model.Filter{{Name: "platform", Operator: "is", Value: []string{"web"}, AutoCaptured: true}})
	q, _, err = wv.buildQuery(p)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(q, "experimental.sessions") {
		t.Errorf("platform is session-only, sessions join required:\n%s", q)
	}
	if !strings.Contains(q, "s.platform") {
		t.Errorf("platform filter was dropped:\n%s", q)
	}
}
