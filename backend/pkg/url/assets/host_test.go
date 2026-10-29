package assets

import "testing"

func TestMatchesHost(t *testing.T) {
	cases := []struct {
		host, pattern string
		want          bool
	}{
		{"example.com", "example.com", true},
		{"a.example.com", "example.com", true},
		{"badexample.com", "example.com", false},
		{"a.example.com", ".example.com", true},
		{"example.com", ".example.com", false},
		{"x.trycloudflare.com", "*.trycloudflare.com", true},
		{"trycloudflare.com", "*.trycloudflare.com", false},
		{"X.TryCloudflare.com", "*.trycloudflare.com", true},
	}
	for _, c := range cases {
		if got := MatchesHost(c.host, c.pattern); got != c.want {
			t.Errorf("MatchesHost(%q, %q) = %v, want %v", c.host, c.pattern, got, c.want)
		}
	}
}

func TestParseHostList(t *testing.T) {
	got := ParseHostList(" *.trycloudflare.com, ,ngrok.io,")
	if len(got) != 2 || got[0] != "*.trycloudflare.com" || got[1] != "ngrok.io" {
		t.Errorf("ParseHostList = %q", got)
	}
}
