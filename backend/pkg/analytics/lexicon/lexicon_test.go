package lexicon

import (
	"reflect"
	"strings"
	"testing"
)

func TestBuildDistinctEventsQuery(t *testing.T) {
	prop := "plan"
	tests := []struct {
		name         string
		propertyName *string
		limit        int
		offset       int
		wantArgs     []interface{}
		wantLimit    bool
	}{
		{"unpaged", nil, 0, 0, []interface{}{uint32(7), uint32(7), uint32(7)}, false},
		{"paged", nil, 20, 40, []interface{}{uint32(7), uint32(7), uint32(7), 20, 40}, true},
		{"property paged", &prop, 10, 0, []interface{}{uint32(7), uint32(7), uint32(7), "plan", 10, 0}, true},
		{"property unpaged", &prop, 0, 0, []interface{}{uint32(7), uint32(7), uint32(7), "plan"}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query, args := buildDistinctEventsQuery(7, tt.propertyName, tt.limit, tt.offset)
			if !reflect.DeepEqual(args, tt.wantArgs) {
				t.Errorf("args = %v, want %v", args, tt.wantArgs)
			}
			if got := strings.Contains(query, "LIMIT ? OFFSET ?"); got != tt.wantLimit {
				t.Errorf("has LIMIT = %v, want %v", got, tt.wantLimit)
			}
			if got, want := strings.Count(query, "?"), len(tt.wantArgs); got != want {
				t.Errorf("placeholders = %d, want %d", got, want)
			}
			if !strings.Contains(query, "ORDER BY sort_ts DESC, display_name, name, auto_captured") {
				t.Errorf("missing ORDER BY")
			}
		})
	}
}
