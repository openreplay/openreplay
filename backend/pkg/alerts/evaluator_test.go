package alerts

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/analytics/model"
)

func TestWindows(t *testing.T) {
	const now int64 = 1_700_000_000_000
	for _, cp := range []int{15, 1440} {
		a := &AlertToExecute{Options: OptionsToExecute{CurrentPeriod: cp}}
		w := windowsFor(a, now)
		cpMs := int64(cp) * minuteMs
		if w.Now != now || w.CurStart != now-cpMs || w.PrevStart != now-2*cpMs {
			t.Errorf("cp=%d: unexpected windows %+v", cp, w)
		}
	}
}

func TestDecide(t *testing.T) {
	cases := []struct {
		name      string
		method    string
		change    string
		op        Operator
		right     float64
		cur, prev float64
		wantV     float64
		wantValid bool
	}{
		{"threshold gt fires", DetectionThreshold, "", OpGt, 10, 12, 99, 12, true},
		{"threshold gt not", DetectionThreshold, "", OpGt, 10, 10, 0, 10, false},
		{"threshold lte", DetectionThreshold, "", OpLte, 10, 10, 0, 10, true},
		{"threshold eq", DetectionThreshold, "", OpEq, 3, 3, 0, 3, true},
		{"change diff", DetectionChange, ChangeTypeChange, OpGt, 1, 5, 3, 2, true},
		{"change diff negative", DetectionChange, ChangeTypeChange, OpLt, 0, 3, 5, -2, true},
		{"percent", DetectionChange, ChangeTypePercent, OpGte, 50, 150, 100, 50, true},
		{"percent prev zero", DetectionChange, ChangeTypePercent, OpGt, 0, 150, 0, 0, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := &AlertToExecute{DetectionMethod: tc.method, Change: tc.change, Query: QueryToExecute{Left: "x", Operator: tc.op, Right: Number(tc.right)}}
			got := decide(a, tc.cur, tc.prev)
			if got.Value != tc.wantV || got.Valid != tc.wantValid {
				t.Errorf("want (%v,%v) got (%v,%v)", tc.wantV, tc.wantValid, got.Value, got.Valid)
			}
		})
	}
}

func argNames(args []any) map[string]any {
	out := map[string]any{}
	for _, a := range args {
		if n, ok := a.(driver.NamedValue); ok {
			out[n.Name] = n.Value
		}
	}
	return out
}

func TestBuildPredefinedQuery(t *testing.T) {
	const now int64 = 1_700_000_000_000
	cases := []struct {
		left      string
		method    string
		wantTable string
		wantParts []string
		absent    []string
	}{
		{
			left: "performance.ttfb.average", method: DetectionThreshold, wantTable: "product_analytics.events",
			wantParts: []string{`avgIf(events."$properties".ttfb::Float64`, "events.`$event_name` = @eventName", "events.`$auto_captured`", "!= 0"},
		},
		{
			left: "performance.dom_build_time.average", method: DetectionChange, wantTable: "product_analytics.events",
			wantParts: []string{`events."$properties".dom_building_time::Float64`},
		},
		{
			left: "performance.crashes.count", method: DetectionThreshold, wantTable: "experimental.sessions",
			wantParts: []string{"uniqExactIf(sessions.session_id", "sessions.datetime >= toDateTime(@rangeStart)", "sessions.errors_count > 0"},
			absent:    []string{"$event_name"},
		},
		{
			left: "errors.javascript.count", method: DetectionThreshold, wantTable: "product_analytics.events",
			wantParts: []string{"uniqExactIf(events.session_id", "events.`$properties`.'source' = 'js_exception'", "@eventName"},
		},
		{
			left: "errors.backend.count", method: DetectionThreshold, wantTable: "product_analytics.events",
			wantParts: []string{"events.`$properties`.'source' != 'js_exception'"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.left, func(t *testing.T) {
			a := &AlertToExecute{ProjectID: 42, DetectionMethod: tc.method,
				Query:   QueryToExecute{Left: tc.left, Operator: OpGt, Right: 123456},
				Options: OptionsToExecute{CurrentPeriod: 15}}
			w := windowsFor(a, now)
			q, args, err := buildPredefinedQuery(a, w)
			if err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(q, "FROM "+tc.wantTable) {
				t.Errorf("table missing in:\n%s", q)
			}
			for _, p := range tc.wantParts {
				if !strings.Contains(q, p) {
					t.Errorf("missing %q in:\n%s", p, q)
				}
			}
			for _, p := range tc.absent {
				if strings.Contains(q, p) {
					t.Errorf("unexpected %q in:\n%s", p, q)
				}
			}
			// operator and threshold must never reach SQL
			if strings.Contains(q, "123456") || strings.Contains(q, " > ") && !strings.Contains(q, "errors_count > 0") && !strings.Contains(q, "duration > 0") {
				t.Errorf("threshold/operator leaked into SQL:\n%s", q)
			}
			names := argNames(args)
			for _, n := range []string{"projectId", "rangeStart", "curStart", "now"} {
				if _, ok := names[n]; !ok {
					t.Errorf("missing param %q in %v", n, names)
				}
			}
			if names["projectId"] != uint16(42) {
				t.Errorf("projectId: %v", names["projectId"])
			}
			if names["now"] != now/1000 || names["curStart"] != w.CurStart/1000 {
				t.Errorf("timestamps not in seconds: %v", names)
			}
			if tc.method == DetectionThreshold && names["rangeStart"] != w.CurStart/1000 {
				t.Errorf("threshold should scan only the current window, got rangeStart=%v", names["rangeStart"])
			}
			if tc.method == DetectionChange && names["rangeStart"] != w.PrevStart/1000 {
				t.Errorf("change should scan both windows, got rangeStart=%v", names["rangeStart"])
			}
		})
	}
	if _, _, err := buildPredefinedQuery(&AlertToExecute{Query: QueryToExecute{Left: "nope"}}, Windows{}); err == nil {
		t.Error("unknown left should error")
	}
	// Python-removed keys are not supported
	for _, left := range []string{"errors.4xx.count", "resources.missing.count"} {
		if IsPredefined(left) {
			t.Errorf("%s should not be predefined", left)
		}
	}
}

// fakeSearch records GetCounts calls.
type fakeSearch struct {
	calls  []*model.SessionsSearchRequest
	counts []int64
	err    error
}

func (f *fakeSearch) GetAll(context.Context, int, uint64, *model.SessionsSearchRequest) (interface{}, error) {
	return nil, nil
}
func (f *fakeSearch) GetBookmarkedSessions(context.Context, int, uint64, *model.SessionsSearchRequest) (interface{}, error) {
	return nil, nil
}
func (f *fakeSearch) GetSessionIds(context.Context, int, uint64, *model.SessionsSearchRequest) (interface{}, error) {
	return nil, nil
}
func (f *fakeSearch) GetCounts(_ context.Context, _ int, req *model.SessionsSearchRequest) (int64, int64, error) {
	if f.err != nil {
		return 0, 0, f.err
	}
	f.calls = append(f.calls, req)
	// simulate the real implementation mutating filters
	req.Filters = append(req.Filters, model.Filter{})
	n := f.counts[len(f.calls)-1]
	return n, 0, nil
}

func TestSeriesEvaluation(t *testing.T) {
	const now int64 = 1_700_000_000_000
	filters := []model.Filter{{}}
	fs := &fakeSearch{counts: []int64{30, 20}}
	ev := &evaluatorImpl{search: fs, chTimeout: 1e9}
	a := &AlertToExecute{ProjectID: 7, DetectionMethod: DetectionChange, Change: ChangeTypeChange,
		Query:   QueryToExecute{Left: LeftCustom, Operator: OpGte, Right: 10},
		Options: OptionsToExecute{CurrentPeriod: 30},
		Filter:  &model.FilterGroup{Filters: filters}}
	res, err := ev.Evaluate(context.Background(), a, now)
	if err != nil {
		t.Fatal(err)
	}
	if res.Value != 10 || !res.Valid {
		t.Errorf("unexpected result %+v", res)
	}
	if len(fs.calls) != 2 {
		t.Fatalf("want 2 GetCounts calls, got %d", len(fs.calls))
	}
	w := windowsFor(a, now)
	if fs.calls[0].StartDate != w.CurStart || fs.calls[0].EndDate != w.Now {
		t.Errorf("current window: %+v", fs.calls[0])
	}
	if fs.calls[1].StartDate != w.PrevStart || fs.calls[1].EndDate != w.CurStart {
		t.Errorf("previous window: %+v", fs.calls[1])
	}
	if fs.calls[0].EventsOrder != "then" {
		t.Errorf("eventsOrder not defaulted: %q", fs.calls[0].EventsOrder)
	}
	if len(a.Filter.Filters) != 1 {
		t.Errorf("alert filters were aliased and mutated: %d", len(a.Filter.Filters))
	}

	// threshold: single call
	fs = &fakeSearch{counts: []int64{5}}
	ev = &evaluatorImpl{search: fs, chTimeout: 1e9}
	a.DetectionMethod = DetectionThreshold
	res, err = ev.Evaluate(context.Background(), a, now)
	if err != nil || res.Value != 5 || len(fs.calls) != 1 {
		t.Errorf("threshold: res=%+v err=%v calls=%d", res, err, len(fs.calls))
	}

	// missing filter
	a.Filter = nil
	if _, err := ev.Evaluate(context.Background(), a, now); err == nil {
		t.Error("nil filter should error")
	}
	// search error propagates
	a.Filter = &model.FilterGroup{}
	ev = &evaluatorImpl{search: &fakeSearch{err: fmt.Errorf("boom")}, chTimeout: 1e9}
	if _, err := ev.Evaluate(context.Background(), a, now); err == nil {
		t.Error("search error should propagate")
	}
}

func TestBuildPropertyQuery(t *testing.T) {
	const now int64 = 1_700_000_000_000
	cases := []struct {
		name      string
		left      string
		source    string
		method    string
		wantKey   string
		wantParts []string
		absent    []string
	}{
		{
			name: "events custom properties (default source)", left: "properties.cart_total", method: DetectionThreshold, wantKey: "cart_total",
			wantParts: []string{"FROM product_analytics.events", `getSubcolumn("properties", @propKey)`, "created_at >= toDateTime(@rangeStart)", "toFloat64OrNull"},
			absent:    []string{"LIMIT 1 BY", "_is_deleted", "cart_total"},
		},
		{
			name: "events auto properties", left: "$properties.load_event_time", source: "events", method: DetectionChange, wantKey: "load_event_time",
			wantParts: []string{`getSubcolumn("$properties", @propKey)`, "avgIf(v, t < toDateTime(@curStart))"},
			absent:    []string{"load_event_time"},
		},
		{
			name: "users latest row per user", left: "properties.plan_seats", source: "Users", method: DetectionThreshold, wantKey: "plan_seats",
			wantParts: []string{"FROM product_analytics.users", `"$last_seen" >= toDateTime(@rangeStart)`, `LIMIT 1 BY "$user_id"`, "ORDER BY _timestamp DESC", "WHERE NOT _is_deleted"},
			absent:    []string{"plan_seats", "$event_name"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := &AlertToExecute{ProjectID: 42, DetectionMethod: tc.method,
				Query:   QueryToExecute{Left: tc.left, Operator: OpGt, Right: 123456, Source: tc.source},
				Options: OptionsToExecute{CurrentPeriod: 15}}
			w := windowsFor(a, now)
			q, args, err := buildPropertyQuery(a, w)
			if err != nil {
				t.Fatal(err)
			}
			for _, p := range tc.wantParts {
				if !strings.Contains(q, p) {
					t.Errorf("missing %q in:\n%s", p, q)
				}
			}
			for _, p := range tc.absent {
				if strings.Contains(q, p) {
					t.Errorf("unexpected %q in:\n%s", p, q)
				}
			}
			if strings.Contains(q, "123456") || strings.Contains(q, " > ") {
				t.Errorf("threshold/operator leaked into SQL:\n%s", q)
			}
			names := argNames(args)
			if names["propKey"] != tc.wantKey {
				t.Errorf("property key must be a bound parameter, got %v", names["propKey"])
			}
			if names["projectId"] != uint16(42) || names["now"] != now/1000 || names["curStart"] != w.CurStart/1000 {
				t.Errorf("params: %v", names)
			}
			if tc.method == DetectionThreshold && names["rangeStart"] != w.CurStart/1000 {
				t.Errorf("threshold should scan only the current window, got rangeStart=%v", names["rangeStart"])
			}
			if tc.method == DetectionChange && names["rangeStart"] != w.PrevStart/1000 {
				t.Errorf("change should scan both windows, got rangeStart=%v", names["rangeStart"])
			}
		})
	}

	// sources without the requested JSON column are rejected before any query is sent
	rejected := []QueryToExecute{
		{Left: "$properties.x", Operator: OpGt, Source: "users"},   // users has no $properties
		{Left: "properties.x", Operator: OpGt, Source: "sessions"}, // sessions has no JSON columns
		{Left: "properties.", Operator: OpGt},                      // empty key
		{Left: "properties.x", Operator: OpGt, Source: "nope"},
	}
	for _, q := range rejected {
		if _, _, err := buildPropertyQuery(&AlertToExecute{Query: q, Options: OptionsToExecute{CurrentPeriod: 15}}, Windows{}); err == nil {
			t.Errorf("%+v should be rejected", q)
		}
	}
}

func TestSupported(t *testing.T) {
	cases := map[string]bool{
		"performance.ttfb.average": true,
		"properties.anything":      true,
		"$properties.anything":     true,
		"resources.missing.count":  false,
		"propertiesx":              false,
	}
	for left, want := range cases {
		if got := Supported(&AlertToExecute{Query: QueryToExecute{Left: left}}); got != want {
			t.Errorf("Supported(%q) = %v, want %v", left, got, want)
		}
	}
	seriesID := int64(1)
	if !Supported(&AlertToExecute{Query: QueryToExecute{Left: LeftCustom}, SeriesID: &seriesID}) {
		t.Error("series alert should be supported")
	}
}
