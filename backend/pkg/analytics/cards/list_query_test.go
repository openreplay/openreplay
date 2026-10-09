package cards

import (
	"strings"
	"testing"
)

func TestClampLimit(t *testing.T) {
	tests := []struct{ in, want int }{
		{0, 0}, {-1, -1}, {50, 50}, {200, 200}, {201, 200}, {10000, 200},
	}
	for _, tt := range tests {
		if got := clampLimit(tt.in); got != tt.want {
			t.Errorf("clampLimit(%d) = %d, want %d", tt.in, got, tt.want)
		}
	}
}

func TestBuildNamePattern(t *testing.T) {
	tests := []struct{ name, in, want string }{
		{"plain", "abc", "%abc%"},
		{"percent", "50%", `%50\%%`},
		{"underscore", "a_b", `%a\_b%`},
		{"backslash", `a\b`, `%a\\b%`},
		{"mixed", `%_\`, `%\%\_\\%`},
		{"empty", "", "%%"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildNamePattern(tt.in); got != tt.want {
				t.Errorf("buildNamePattern(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestBuildListQuery(t *testing.T) {
	q := buildListQuery("JOIN x", "WHERE y", "ORDER BY z")
	for _, want := range []string{"COUNT(*) OVER() AS total_count", "LIMIT @limit", "OFFSET @offset", "JOIN x", "WHERE y", "ORDER BY z"} {
		if !strings.Contains(q, want) {
			t.Errorf("query missing %q", want)
		}
	}
}
