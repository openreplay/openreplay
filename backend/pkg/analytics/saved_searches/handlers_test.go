package saved_searches

import (
	"net/http"
	"net/url"
	"testing"
)

func TestParseWithStats(t *testing.T) {
	tests := []struct {
		name  string
		query string
		want  bool
	}{
		{"absent", "", false},
		{"false", "withStats=false", false},
		{"true", "withStats=true", true},
		{"zero", "withStats=0", false},
		{"one", "withStats=1", true},
		{"upperFalse", "withStats=FALSE", false},
		{"garbage", "withStats=nope", false},
		{"lowerF", "withStats=f", false},
		{"upperF", "withStats=F", false},
		{"lowerT", "withStats=t", true},
		{"upperT", "withStats=T", true},
		{"emptyValue", "withStats=", false},
		{"off", "withStats=off", false},
		{"no", "withStats=no", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &http.Request{URL: &url.URL{RawQuery: tt.query}}
			if got := parseWithStats(r); got != tt.want {
				t.Errorf("parseWithStats(%q) = %v, want %v", tt.query, got, tt.want)
			}
		})
	}
}
