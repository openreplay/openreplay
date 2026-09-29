package events

import (
	"strings"
	"testing"
)

func TestLikePrefixPattern(t *testing.T) {
	tests := []struct {
		name, in, want string
	}{
		{"plain", "https://a.com/x", "https://a.com/x%"},
		{"percent", "a%b", `a\%b%`},
		{"underscore", "a_b", `a\_b%`},
		{"backslash", `a\b`, `a\\b%`},
		{"mixed", `a%_\b`, `a\%\_\\b%`},
		{"empty", "", "%"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := likePrefixPattern(tt.in); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestMobileQueriesFilterByProject(t *testing.T) {
	tests := []struct {
		name  string
		query string
	}{
		{"crashes", mobileCrashesQuery},
		{"customs", mobileCustomsQuery},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := strings.Join(strings.Fields(tt.query), " ")
			if !strings.Contains(q, "WHERE project_id = ? AND session_id = ?") {
				t.Errorf("project_id must precede session_id: %s", q)
			}
			if !strings.Contains(q, "created_at BETWEEN ? AND ?") {
				t.Errorf("missing created_at range: %s", q)
			}
			if strings.Count(q, "?") != 4 {
				t.Errorf("want 4 placeholders (projID, sessID, lower, upper), got %d", strings.Count(q, "?"))
			}
		})
	}
}
