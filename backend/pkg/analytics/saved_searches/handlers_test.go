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
		def   bool
		want  bool
	}{
		{"absent", "", false, false},
		{"false", "withStats=false", false, false},
		{"true", "withStats=true", false, true},
		{"zero", "withStats=0", false, false},
		{"one", "withStats=1", false, true},
		{"upperFalse", "withStats=FALSE", false, false},
		{"garbage", "withStats=nope", false, false},
		{"lowerF", "withStats=f", false, false},
		{"upperF", "withStats=F", false, false},
		{"lowerT", "withStats=t", false, true},
		{"upperT", "withStats=T", false, true},
		{"emptyValue", "withStats=", false, false},
		{"off", "withStats=off", false, false},
		{"no", "withStats=no", false, false},
		{"absentDefaultTrue", "", true, true},
		{"emptyValueDefaultTrue", "withStats=", true, true},
		{"garbageDefaultTrue", "withStats=nope", true, true},
		{"falseDefaultTrue", "withStats=false", true, false},
		{"zeroDefaultTrue", "withStats=0", true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &http.Request{URL: &url.URL{RawQuery: tt.query}}
			if got := parseWithStats(r, tt.def); got != tt.want {
				t.Errorf("parseWithStats(%q, %v) = %v, want %v", tt.query, tt.def, got, tt.want)
			}
		})
	}
}
