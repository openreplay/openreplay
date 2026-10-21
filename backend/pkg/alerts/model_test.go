package alerts

import (
	"encoding/json"
	"reflect"
	"testing"
)

func parse(t *testing.T, body string) (*AlertRequest, error) {
	t.Helper()
	req := &AlertRequest{}
	if err := json.Unmarshal([]byte(body), req); err != nil {
		return nil, err
	}
	return req, req.Validate()
}

func TestAlertRequestParsing(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantErr    bool
		wantSeries *int
		wantQuery  map[string]any
		wantOpts   map[string]any
		wantChange string
	}{
		{
			name: "predefined column with frontend payload",
			body: `{"name":"Slow pages","detectionMethod":"threshold","detection_method":"threshold","description":"",
				"query":{"left":"performance.page_load_time.average","operator":">","right":"5000"},
				"options":{"message":[{"type":"slack","value":3},{"type":"email","value":"a@b.c"}],"previousPeriod":15,"currentPeriod":30}}`,
			wantQuery: map[string]any{"left": "performance.page_load_time.average", "right": float64(5000), "operator": ">"},
			wantOpts: map[string]any{
				"message":          []any{map[string]any{"type": "slack", "value": "3"}, map[string]any{"type": "email", "value": "a@b.c"}},
				"currentPeriod":    float64(30),
				"previousPeriod":   float64(15),
				"lastNotification": nil,
				"renotifyInterval": float64(720),
			},
			wantChange: "change",
		},
		{
			name:       "series id as number becomes CUSTOM",
			body:       `{"name":"x","detectionMethod":"change","change":"percent","query":{"left":42,"operator":"<=","right":1.5},"options":{"currentPeriod":60}}`,
			wantSeries: intPtr(42),
			wantQuery:  map[string]any{"left": "CUSTOM", "right": 1.5, "operator": "<="},
			wantOpts: map[string]any{
				"message":          []any{},
				"currentPeriod":    float64(60),
				"previousPeriod":   float64(15),
				"lastNotification": nil,
				"renotifyInterval": float64(720),
			},
			wantChange: "percent",
		},
		{
			name:       "series id as numeric string",
			body:       `{"name":"x","detectionMethod":"threshold","query":{"left":"7","operator":"=","right":1},"options":{"currentPeriod":15,"renotifyInterval":null}}`,
			wantSeries: intPtr(7),
			wantQuery:  map[string]any{"left": "CUSTOM", "right": float64(1), "operator": "="},
			wantOpts: map[string]any{
				"message":          []any{},
				"currentPeriod":    float64(15),
				"previousPeriod":   float64(15),
				"lastNotification": nil,
				"renotifyInterval": nil,
			},
			wantChange: "change",
		},
		{name: "unknown column", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"foo","operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "invalid period", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":16}}`, wantErr: true},
		{name: "missing current period", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":1},"options":{}}`, wantErr: true},
		{name: "invalid operator", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":"!=","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "invalid detection method", body: `{"name":"x","detectionMethod":"foo","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "invalid change", body: `{"name":"x","detectionMethod":"change","change":"foo","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "invalid name", body: `{"name":"<script>","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "missing name", body: `{"detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "missing query", body: `{"name":"x","detectionMethod":"threshold","options":{"currentPeriod":15}}`, wantErr: true},
		{name: "missing right", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">"},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "CUSTOM without series", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"CUSTOM","operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "series id out of int4 range", body: `{"name":"x","detectionMethod":"threshold","query":{"left":99999999999,"operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "series id string out of int4 range", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"99999999999","operator":">","right":1},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "NaN right", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":"NaN"},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "Inf right", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":"Inf"},"options":{"currentPeriod":15}}`, wantErr: true},
		{name: "null message value", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15,"message":[{"type":"slack","value":null}]}}`, wantErr: true},
		{name: "missing message value", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15,"message":[{"type":"email"}]}}`, wantErr: true},
		{name: "null message list", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15,"message":null}}`, wantErr: true},
		{name: "null previous period", body: `{"name":"x","detectionMethod":"change","query":{"left":"errors.backend.count","operator":">","right":1},"options":{"currentPeriod":15,"previousPeriod":null}}`, wantErr: true},
		{name: "non numeric right", body: `{"name":"x","detectionMethod":"threshold","query":{"left":"errors.backend.count","operator":">","right":"abc"},"options":{"currentPeriod":15}}`, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := parse(t, tt.body)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %s", err)
			}
			if !reflect.DeepEqual(req.SeriesID(), tt.wantSeries) {
				t.Errorf("seriesID = %v, want %v", req.SeriesID(), tt.wantSeries)
			}
			if req.ChangeType() != tt.wantChange {
				t.Errorf("change = %s, want %s", req.ChangeType(), tt.wantChange)
			}
			q, _ := req.QueryJSON()
			var gotQuery map[string]any
			_ = json.Unmarshal(q, &gotQuery)
			if !reflect.DeepEqual(gotQuery, tt.wantQuery) {
				t.Errorf("query = %v, want %v", gotQuery, tt.wantQuery)
			}
			o, _ := req.OptionsJSON()
			var gotOpts map[string]any
			_ = json.Unmarshal(o, &gotOpts)
			if !reflect.DeepEqual(gotOpts, tt.wantOpts) {
				t.Errorf("options = %v, want %v", gotOpts, tt.wantOpts)
			}
		})
	}
}

func TestAlertToFront(t *testing.T) {
	a := &Alert{SeriesID: intPtr(5), Query: map[string]any{"left": "CUSTOM"}}
	a.toFront()
	if a.SeriesID != nil || a.Query["left"] != 5 {
		t.Errorf("custom alert not transformed: seriesId=%v left=%v", a.SeriesID, a.Query["left"])
	}

	b := &Alert{Query: map[string]any{"left": "errors.backend.count"}}
	b.toFront()
	if b.Query["left"] != "errors.backend.count" {
		t.Errorf("predefined alert changed: left=%v", b.Query["left"])
	}
}

func TestPredefinedTriggers(t *testing.T) {
	triggers := PredefinedTriggers()
	if len(triggers) != len(PredefinedColumns) {
		t.Fatalf("got %d triggers, want %d", len(triggers), len(PredefinedColumns))
	}
	for _, tr := range triggers {
		if tr.Value == string(ColumnCustom) {
			t.Errorf("CUSTOM must not be a predefined trigger")
		}
	}
	if triggers[0].Unit != "ms" || triggers[8].Unit != "count" {
		t.Errorf("unexpected units: %s, %s", triggers[0].Unit, triggers[8].Unit)
	}
}

func intPtr(v int) *int {
	return &v
}
