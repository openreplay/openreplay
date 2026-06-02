package filters_catalog

import "testing"

func TestStringToSQLLike(t *testing.T) {
	cases := map[string]string{
		"abc":   "%abc%",
		"^abc":  "abc%",
		"abc$":  "%abc",
		"^abc$": "abc",
		"a*c":   "%a%c%",
		"a  b":  "%a b%",
		"%abc":  "%abc%",
		"abc%":  "%abc%",
		"%abc%": "%abc%",
	}
	for in, want := range cases {
		if got := stringToSQLLike(in); got != want {
			t.Errorf("stringToSQLLike(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestResolveAutocompleteScope(t *testing.T) {
	cases := []struct {
		source, property, want string
	}{
		{"session", "anything", "sessions"},
		{"sessions", "anything", "sessions"},
		{"metadata", "anything", "sessions"},
		{"metadatas", "anything", "sessions"},
		{"event", "anything", "events"},
		{"events", "anything", "events"},
		{"user", "$user_id", "users"},
		{"users", "$email", "users"},
		{"user", "plain", "sessions"},
		{"users", "plain", "sessions"},
		{"", "anything", ""},
		{"unknown", "anything", ""},
	}
	for _, c := range cases {
		if got := resolveAutocompleteScope(c.source, c.property); got != c.want {
			t.Errorf("resolveAutocompleteScope(%q,%q) = %q, want %q", c.source, c.property, got, c.want)
		}
	}
}

func TestKeyToTitleCase(t *testing.T) {
	cases := map[string]string{
		"issue_type":     "Issue Type",
		"hesitationTime": "Hesitation Time",
		"url_host":       "Url Host",
		"crash":          "Crash",
	}
	for in, want := range cases {
		if got := keyToTitleCase(in); got != want {
			t.Errorf("keyToTitleCase(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestIssueTypeName(t *testing.T) {
	if got := issueTypeName("js_exception"); got != "Errors" {
		t.Errorf("issueTypeName(js_exception) = %q, want Errors", got)
	}
	if got := issueTypeName("click_rage"); got != "Click Rage" {
		t.Errorf("issueTypeName(click_rage) = %q, want Click Rage", got)
	}
	if got := issueTypeName("custom_thing"); got != "Custom Thing" {
		t.Errorf("issueTypeName(custom_thing) = %q, want Custom Thing", got)
	}
}
