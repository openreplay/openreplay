package proxy

import (
	"reflect"
	"testing"
)

func TestGetLiveSessionsRequestParse(t *testing.T) {
	tests := []struct {
		name    string
		filters []interface{}
		want    map[string]interface{}
	}{
		{
			name: "frontend filter",
			filters: []interface{}{
				map[string]interface{}{"name": "userId", "operator": "is", "value": []interface{}{"u1"}},
			},
			want: map[string]interface{}{
				"userId": map[string]interface{}{"values": []interface{}{"u1"}, "operator": "is"},
			},
		},
		{
			name: "metadata filter uses source",
			filters: []interface{}{
				map[string]interface{}{"name": "metadata_1", "source": "plan", "operator": "is", "value": []interface{}{"pro"}},
			},
			want: map[string]interface{}{
				"plan": map[string]interface{}{"values": []interface{}{"pro"}, "operator": "is"},
			},
		},
		{
			name: "filter without name is skipped",
			filters: []interface{}{
				map[string]interface{}{"type": "userId", "operator": "is", "value": []interface{}{"u1"}},
			},
			want: map[string]interface{}{},
		},
		{
			name: "non-string name is skipped",
			filters: []interface{}{
				map[string]interface{}{"name": 42, "value": []interface{}{"u1"}},
			},
			want: map[string]interface{}{},
		},
		{
			name: "metadata filter without source is skipped",
			filters: []interface{}{
				map[string]interface{}{"name": "metadata_1", "value": []interface{}{"pro"}},
			},
			want: map[string]interface{}{},
		},
		{
			name:    "non-object filter is skipped",
			filters: []interface{}{"userId", nil},
			want:    map[string]interface{}{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &GetLiveSessionsRequest{Filters: tt.filters, Limit: 10, Page: 1, Sort: "timestamp", Order: "desc"}
			got := req.Parse()
			if !reflect.DeepEqual(got.Filter, tt.want) {
				t.Errorf("Parse().Filter = %v, want %v", got.Filter, tt.want)
			}
		})
	}
}
