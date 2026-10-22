package scheduler

import (
	"strings"
	"testing"
)

func TestParseSchedules(t *testing.T) {
	cases := []struct {
		name    string
		raw     string
		want    map[string]string
		wantErr string
	}{
		{name: "empty", raw: "", want: map[string]string{}},
		{name: "whitespace only", raw: "   \t ", want: map[string]string{}},
		{name: "single", raw: "alerts * * * * *", want: map[string]string{"alerts": "* * * * *"}},
		{name: "two entries with spaces after comma", raw: "alerts * * * * *, other 0 5 * * 1",
			want: map[string]string{"alerts": "* * * * *", "other": "0 5 * * 1"}},
		{name: "trailing comma and empty pieces", raw: "alerts * * * * *, ,",
			want: map[string]string{"alerts": "* * * * *"}},
		{name: "tabs and double spaces normalized", raw: "alerts\t*  *   * * *",
			want: map[string]string{"alerts": "* * * * *"}},
		{name: "descriptors", raw: "alerts @every 10s, other @hourly",
			want: map[string]string{"alerts": "@every 10s", "other": "@hourly"}},
		{name: "name lowercased", raw: "Alerts */5 * * * *", want: map[string]string{"alerts": "*/5 * * * *"}},
		{name: "missing expression", raw: "alerts", wantErr: `expected "<name> <cron expression>"`},
		{name: "invalid expression", raw: "alerts 61 * * * *", wantErr: "invalid expression"},
		{name: "duplicate", raw: "alerts * * * * *, alerts @hourly", wantErr: "duplicate entry"},
		{name: "list syntax unsupported", raw: "alerts 0 5 * * 1,3", wantErr: "CRON_SCHEDULES entry"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ParseSchedules(tc.raw)
			if tc.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("want error containing %q, got %v", tc.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(got) != len(tc.want) {
				t.Fatalf("want %v, got %v", tc.want, got)
			}
			for k, v := range tc.want {
				if got[k] != v {
					t.Errorf("key %q: want %q, got %q", k, v, got[k])
				}
			}
		})
	}
}

func TestParseDisabled(t *testing.T) {
	if got := ParseDisabled(""); len(got) != 0 {
		t.Fatalf("want empty, got %v", got)
	}
	got := ParseDisabled("alerts, Other ,,")
	if len(got) != 2 {
		t.Fatalf("want 2 entries, got %v", got)
	}
	for _, k := range []string{"alerts", "other"} {
		if _, ok := got[k]; !ok {
			t.Errorf("missing %q in %v", k, got)
		}
	}
}

func TestParseOverrides(t *testing.T) {
	o, err := ParseOverrides("alerts @hourly", "alerts")
	if err != nil {
		t.Fatal(err)
	}
	if o.Schedules["alerts"] != "@hourly" {
		t.Errorf("schedule not parsed: %v", o.Schedules)
	}
	if _, ok := o.Disabled["alerts"]; !ok {
		t.Errorf("disabled not parsed: %v", o.Disabled)
	}
	if _, err := ParseOverrides("alerts bad", ""); err == nil {
		t.Error("want error for invalid schedule")
	}
}
