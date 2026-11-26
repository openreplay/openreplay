package ipfilter

import "testing"

func TestContains(t *testing.T) {
	f, err := New(" 203.0.113.7, 198.51.100.17/24 ,,2001:db8::/32,::ffff:192.0.2.1,10.0.0.0/8")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cases := map[string]bool{
		"203.0.113.7":            true,
		"203.0.113.8":            false,
		"198.51.100.1":           true, // host bits of the configured range are ignored
		"198.51.100.255":         true,
		"198.51.101.1":           false,
		"10.20.30.40":            true,
		"2001:db8::1":            true,
		"2001:db8::1%eth0":       true,
		"2001:db9::1":            false,
		"::ffff:203.0.113.7":     true, // IPv4-mapped client against an IPv4 entry
		"192.0.2.1":              true, // IPv4 client against an IPv4-mapped entry
		"8.8.8.8":                false,
		"":                       false,
		"not-an-ip":              false,
		"203.0.113.7, 10.0.0.1":  false,
		"203.0.113.7:8080":       false,
		"[2001:db8::1]":          false,
		"::ffff:198.51.100.1/24": false,
	}
	for ip, want := range cases {
		if got := f.Contains(ip); got != want {
			t.Errorf("Contains(%q) = %v, want %v", ip, got, want)
		}
	}
}

func TestEmptyFilterMatchesNothing(t *testing.T) {
	for _, ranges := range []string{"", " ", ",", " , "} {
		f, err := New(ranges)
		if err != nil {
			t.Fatalf("New(%q): unexpected error: %v", ranges, err)
		}
		if f.Contains("203.0.113.7") {
			t.Errorf("New(%q) should match nothing", ranges)
		}
	}
}

func TestNewRejectsInvalidRanges(t *testing.T) {
	for _, ranges := range []string{
		"not-an-ip",
		"203.0.113.7,not-an-ip",
		"203.0.113.0/33",
		"2001:db8::/129",
		"203.0.113.0/",
		"::ffff:203.0.113.0/120",
		"203.0.113.1-203.0.113.9",
	} {
		if _, err := New(ranges); err == nil {
			t.Errorf("New(%q) should fail", ranges)
		}
	}
}
