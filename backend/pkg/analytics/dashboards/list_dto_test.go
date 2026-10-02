package dashboards

import (
	"encoding/json"
	"reflect"
	"sort"
	"testing"
)

func TestDashboardJSONKeys(t *testing.T) {
	tests := []struct {
		name  string
		value any
		keys  []string
	}{
		{
			name:  "list item",
			value: DashboardListItem{},
			keys:  []string{"createdAt", "dashboardId", "description", "isPinned", "isPublic", "name", "ownerEmail", "ownerName", "projectId"},
		},
		{
			name:  "detail response",
			value: GetDashboardResponse{},
			keys:  []string{"createdAt", "dashboardId", "description", "isPinned", "isPublic", "name", "ownerEmail", "ownerName", "projectId", "widgets"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b, err := json.Marshal(tt.value)
			if err != nil {
				t.Fatal(err)
			}
			m := map[string]json.RawMessage{}
			if err := json.Unmarshal(b, &m); err != nil {
				t.Fatal(err)
			}
			got := make([]string, 0, len(m))
			for k := range m {
				got = append(got, k)
			}
			sort.Strings(got)
			if !reflect.DeepEqual(got, tt.keys) {
				t.Errorf("keys\n got %v\nwant %v", got, tt.keys)
			}
		})
	}
}
