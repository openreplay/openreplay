package dashboards

import (
	"encoding/json"
	"testing"
)

func TestDashboardJSONKeys(t *testing.T) {
	tests := []struct {
		name    string
		value   any
		absent  []string
		present []string
	}{
		{
			name:    "list item",
			value:   DashboardListItem{},
			absent:  []string{"widgets"},
			present: []string{"dashboardId", "projectId", "name", "description", "isPublic", "isPinned", "ownerEmail", "ownerName", "createdAt"},
		},
		{
			name:    "detail response",
			value:   GetDashboardResponse{},
			present: []string{"widgets", "dashboardId", "name"},
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
