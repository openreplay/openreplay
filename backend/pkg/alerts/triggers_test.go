package alerts

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// fakeRows serves fixed rows through the driver.Rows interface.
type fakeRows struct {
	rows [][]any
	i    int
	err  error
}

func (r *fakeRows) Next() bool { r.i++; return r.i <= len(r.rows) }
func (r *fakeRows) Scan(dest ...any) error {
	row := r.rows[r.i-1]
	for i, d := range dest {
		reflect.ValueOf(d).Elem().Set(reflect.ValueOf(row[i]))
	}
	return nil
}
func (r *fakeRows) ScanStruct(any) error             { return nil }
func (r *fakeRows) ColumnTypes() []driver.ColumnType { return nil }
func (r *fakeRows) Totals(...any) error              { return nil }
func (r *fakeRows) Columns() []string                { return nil }
func (r *fakeRows) Close() error                     { return nil }
func (r *fakeRows) Err() error                       { return r.err }
func (r *fakeRows) HasData() bool                    { return len(r.rows) > 0 }

type fakeCH struct {
	rows  [][]any
	err   error
	query string
	args  []any
}

func (f *fakeCH) Query(_ context.Context, query string, args ...any) (driver.Rows, error) {
	f.query, f.args = query, args
	if f.err != nil {
		return nil, f.err
	}
	return &fakeRows{rows: f.rows}, nil
}

func TestPropertyTrigger(t *testing.T) {
	cases := []struct {
		source, name string
		auto         bool
		display, dt  string
		want         Trigger
		ok           bool
	}{
		{"events", "cart_total", false, "Cart total", "number", Trigger{Name: "Cart total", Value: "properties.cart_total", Source: "events", DataType: "number"}, true},
		{"events", "load_event_time", true, "", "integer", Trigger{Name: "load_event_time", Value: "$properties.load_event_time", Source: "events", DataType: "integer"}, true},
		{"users", "plan", false, "Plan", "string", Trigger{Name: "Plan", Value: "properties.plan", Source: "users", DataType: "string"}, true},
		{"events", "", false, "nameless", "", Trigger{}, false},
	}
	for _, tc := range cases {
		got, ok := propertyTrigger(tc.source, tc.name, tc.auto, tc.display, tc.dt)
		if ok != tc.ok || got != tc.want {
			t.Errorf("propertyTrigger(%q,%q,%v): got %+v/%v want %+v/%v", tc.source, tc.name, tc.auto, got, ok, tc.want, tc.ok)
		}
		if ok {
			// the value is exactly what the cron evaluator accepts
			q := QueryToExecute{Left: got.Value.(string), Operator: OpGt, Source: got.Source}
			if !q.IsProperty() || q.Validate() != nil {
				t.Errorf("trigger value %q is not a valid property alert left", got.Value)
			}
			if got.Predefined || got.MetricID != nil || got.SeriesID != nil {
				t.Errorf("must not look like a predefined/series trigger: %+v", got)
			}
		}
	}
}

func TestPropertyTriggersQuery(t *testing.T) {
	ch := &fakeCH{rows: [][]any{
		{"events", "cart_total", false, "Cart total", "visible", "number"},
		{"users", "seats", true, "seats", "visible", "integer"},
		{"users", "", false, "", "visible", ""},
	}}
	s := &alertsImpl{ch: ch}
	got, err := s.propertyTriggers(context.Background(), 42)
	if err != nil {
		t.Fatal(err)
	}
	want := []Trigger{
		{Name: "Cart total", Value: "properties.cart_total", Source: "events", DataType: "number"},
		{Name: "seats", Value: "$properties.seats", Source: "users", DataType: "integer"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v want %+v", got, want)
	}
	// project id is bound, never spliced; only events/users; hidden rows filtered in SQL
	if len(ch.args) != 1 {
		t.Fatalf("args: %v", ch.args)
	}
	if nv, ok := ch.args[0].(driver.NamedValue); !ok || nv.Name != "projectId" || nv.Value != uint16(42) {
		t.Errorf("projectId param: %+v", ch.args[0])
	}
	for _, p := range []string{"FROM product_analytics.all_properties\n", "product_analytics.all_properties_customized", "product_analytics.event_properties", "product_analytics.user_properties",
		"source IN ('events', 'users')", "HAVING status = 'visible'", "or_property_display_name", "LIMIT 1 BY project_id, source, property_name, auto_captured"} {
		if !strings.Contains(ch.query, p) {
			t.Errorf("query missing %q", p)
		}
	}
	if strings.Contains(ch.query, "42") || strings.Contains(ch.query, "sessions") {
		t.Errorf("unexpected literal in query:\n%s", ch.query)
	}

	// ClickHouse failure is reported
	if _, err := (&alertsImpl{ch: &fakeCH{err: errors.New("ch down")}}).propertyTriggers(context.Background(), 1); err == nil {
		t.Error("clickhouse error should propagate")
	}
	// row iteration error is reported
	bad := &alertsImpl{ch: &fakeCH{}}
	bad.ch = &fakeCHErrRows{}
	if _, err := bad.propertyTriggers(context.Background(), 1); err == nil {
		t.Error("rows error should propagate")
	}
	// no ClickHouse wired: no property triggers, no error
	if got, err := (&alertsImpl{}).propertyTriggers(context.Background(), 1); err != nil || got != nil {
		t.Errorf("nil ch: %v %v", got, err)
	}
}

type fakeCHErrRows struct{}

func (fakeCHErrRows) Query(context.Context, string, ...any) (driver.Rows, error) {
	return &fakeRows{err: errors.New("iteration failed")}, nil
}
