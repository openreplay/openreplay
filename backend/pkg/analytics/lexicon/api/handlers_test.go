package api

import (
	"net/url"
	"testing"
)

func TestParseEventsPagination(t *testing.T) {
	tests := []struct {
		name       string
		query      string
		wantLimit  int
		wantOffset int
	}{
		{"absent", "", 0, 0},
		{"page only", "page=3", 0, 0},
		{"invalid limit", "limit=abc", 0, 0},
		{"negative limit", "limit=-5", 0, 0},
		{"limit", "limit=25", 25, 0},
		{"limit and page", "limit=25&page=3", 25, 50},
		{"invalid page", "limit=25&page=0", 25, 0},
		{"page beyond offset range", "limit=25&page=9223372036854775807", 25, 0},
		{"page just beyond offset range", "limit=500&page=4294969", 500, 0},
		{"last valid page", "limit=500&page=4294968", 500, 2147483500},
		{"clamped", "limit=9999&page=2", 500, 500},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q, _ := url.ParseQuery(tt.query)
			limit, offset := parseEventsPagination(q)
			if limit != tt.wantLimit || offset != tt.wantOffset {
				t.Errorf("got (%d, %d), want (%d, %d)", limit, offset, tt.wantLimit, tt.wantOffset)
			}
		})
	}
}
