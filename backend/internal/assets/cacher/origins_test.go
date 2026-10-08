package cacher

import (
	"errors"
	"net/http"
	"net/url"
	"testing"

	"golang.org/x/net/http/httpproxy"
)

func mustURL(t *testing.T, s string) *url.URL {
	t.Helper()
	u, err := url.Parse(s)
	if err != nil {
		t.Fatal(err)
	}
	return u
}

func TestParseOriginsRejectsInvalid(t *testing.T) {
	for _, raw := range []string{
		"example.com",                    // no scheme
		"ftp://example.com",              // unsupported scheme
		"https://example.com/static",     // path
		"https://example.com?x=1",        // query
		"https://user:pw@example.com",    // credentials
		"https://",                       // no host
		"https://a.com, https://b.com/x", // one bad entry fails the whole list
		",",                              // nonempty value with no origins must fail closed
		" , ,",
	} {
		if _, err := parseOrigins(raw); err == nil {
			t.Errorf("%q should be rejected", raw)
		}
	}
}

func TestOriginSetAllows(t *testing.T) {
	empty, err := parseOrigins(" ")
	if err != nil {
		t.Fatal(err)
	}
	if !empty.allows(mustURL(t, "http://10.0.0.1/x.css")) {
		t.Fatal("empty allowlist must allow everything")
	}

	set, err := parseOrigins("https://App.Example.com, https://cdn.example.com:443/, http://legacy.example.com:8080")
	if err != nil {
		t.Fatal(err)
	}
	allowed := []string{
		"https://app.example.com/a.css",
		"HTTPS://APP.EXAMPLE.COM:443/b.woff",
		"https://cdn.example.com/c.css",
		"http://legacy.example.com:8080/d.css",
	}
	for _, s := range allowed {
		if !set.allows(mustURL(t, s)) {
			t.Errorf("%s should be allowed", s)
		}
	}
	denied := []string{
		"http://app.example.com/a.css",       // scheme differs
		"https://app.example.com:8443/a.css", // port differs
		"https://app.example.com.evil.org/a", // suffix trick
		"https://evil-app.example.com/a",     // other subdomain
		"http://legacy.example.com/d.css",    // default port != 8080
		"https://cdn.example.com@evil.org/x", // userinfo
		"http://172.16.0.35:8282/hub/api/x",  // the reported target
	}
	for _, s := range denied {
		if set.allows(mustURL(t, s)) {
			t.Errorf("%s should be denied", s)
		}
	}
}

func TestOriginKeyIPv6(t *testing.T) {
	set, err := parseOrigins("https://[2606:4700::1111]")
	if err != nil {
		t.Fatal(err)
	}
	if !set.allows(mustURL(t, "https://[2606:4700::1111]:443/a.css")) {
		t.Fatal("same IPv6 origin with explicit default port should match")
	}
	if set.allows(mustURL(t, "https://[2606:4700::1112]/a.css")) {
		t.Fatal("different IPv6 host should not match")
	}
	if got := originKey(mustURL(t, "https://[::1]/x")); got != "https://[::1]:443" {
		t.Fatalf("unexpected key %q", got)
	}
}

func TestCheckRedirectEnforcesOrigins(t *testing.T) {
	set, _ := parseOrigins("https://app.example.com")
	c := &cacher{origins: set, proxy: (&httpproxy.Config{}).ProxyFunc()}

	ok, _ := http.NewRequest("GET", "https://app.example.com/next.css", nil)
	if err := c.checkRedirect(ok, nil); err != nil {
		t.Fatalf("same-origin redirect should pass: %v", err)
	}

	bad, _ := http.NewRequest("GET", "http://10.0.0.1/internal", nil)
	var origin *originNotAllowedError
	if err := c.checkRedirect(bad, nil); !errors.As(err, &origin) {
		t.Fatalf("expected originNotAllowedError, got %v", err)
	}

	via := make([]*http.Request, 10)
	if err := c.checkRedirect(ok, via); err == nil {
		t.Fatal("redirect limit should be enforced")
	}
}
