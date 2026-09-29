package cards

import (
	"encoding/json"
	"testing"
)

func keysOf(t *testing.T, v any) map[string]json.RawMessage {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	m := map[string]json.RawMessage{}
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func TestCardListItemJSONKeys(t *testing.T) {
	tests := []struct {
		name    string
		value   any
		absent  []string
		present []string
	}{
		{
			name:    "list item",
			value:   CardListItem{},
			absent:  []string{"series", "config", "defaultConfig", "thumbnail", "rows", "stepsBefore", "stepsAfter", "startPoint", "excludes", "breakdowns"},
			present: []string{"metricId", "projectId", "userId", "name", "metricType", "viewType", "metricOf", "metricValue", "metricFormat", "isPublic", "createdAt"},
		},
		{
			name:    "detail response",
			value:   CardGetResponse{},
			present: []string{"series", "config", "defaultConfig", "thumbnail", "rows", "breakdowns", "metricId", "name"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := keysOf(t, tt.value)
			for _, k := range tt.absent {
				if _, ok := m[k]; ok {
					t.Errorf("unexpected key %q", k)
				}
			}
			for _, k := range tt.present {
				if _, ok := m[k]; !ok {
					t.Errorf("missing key %q", k)
				}
			}
		})
	}
}
