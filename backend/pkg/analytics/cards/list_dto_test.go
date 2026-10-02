package cards

import (
	"encoding/json"
	"reflect"
	"sort"
	"testing"
)

func keysOf(t *testing.T, v any) []string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	m := map[string]json.RawMessage{}
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func TestCardListItemJSONKeys(t *testing.T) {
	tests := []struct {
		name  string
		value any
		keys  []string
	}{
		{
			name:  "list item",
			value: CardListItem{},
			keys:  []string{"createdAt", "isPublic", "metricFormat", "metricId", "metricOf", "metricType", "metricValue", "name", "projectId", "userId", "viewType"},
		},
		{
			name:  "detail response",
			value: CardGetResponse{},
			keys: []string{"breakdowns", "config", "createdAt", "defaultConfig", "excludes", "isPublic", "metricFormat", "metricId", "metricOf",
				"metricType", "metricValue", "name", "projectId", "rows", "series", "startPoint", "stepsAfter", "stepsBefore", "thumbnail", "userId", "viewType"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := keysOf(t, tt.value); !reflect.DeepEqual(got, tt.keys) {
				t.Errorf("keys\n got %v\nwant %v", got, tt.keys)
			}
		})
	}
}
