package cacher

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/metrics/assets"
)

func newDenyCacher(t *testing.T, l *recLog, deny string) *cacher {
	t.Helper()
	cfg := &config.Config{
		AssetsOrigin: "https://cdn.example", AssetsSizeLimit: 1 << 20, AssetsRetries: 1,
		AssetsRetryBaseMs: 10, AssetsRetryMaxMs: 10, AssetsRetryHeapLimit: 10,
		AssetsWorkerCount: 1, AssetsQueueSize: 4, AssetsPerHostLimit: 4, AssetsHTTPTimeout: 2,
		AssetsDenyHosts: deny, AssetsAllowPrivate: true, // httptest listens on 127.0.0.1
	}
	cfg.KeyScheme = "daily"
	c, err := NewCacher(l, cfg, nopStore{}, assets.New("t"), nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(c.Stop)
	return c
}

// A denied host must never be contacted (not even resolved): runtime security
// (e.g. Wiz) kills the process on DNS lookups of tunnel domains.
func TestDeniedHostIsNeverFetched(t *testing.T) {
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
	}))
	defer srv.Close()

	l := &recLog{}
	c := newDenyCacher(t, l, "example.org, 127.0.0.1")
	c.CacheURL(42, srv.URL+"/probe-a.css")

	if !l.waitIssue("reason=denied_host", 2*time.Second) {
		t.Fatalf("no denied_host log, got %q", l.issues)
	}
	if n := atomic.LoadInt32(&hits); n != 0 {
		t.Errorf("denied host was fetched %d times", n)
	}
}

// An allowed host must not be able to bounce the cacher to a denied one.
func TestRedirectToDeniedHostIsNotFollowed(t *testing.T) {
	var deniedHits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != "" && strings.HasPrefix(r.Host, "localhost") {
			atomic.AddInt32(&deniedHits, 1)
			return
		}
		http.Redirect(w, r, strings.Replace("http://"+r.Host, "127.0.0.1", "localhost", 1)+"/b.css", http.StatusFound)
	}))
	defer srv.Close()

	l := &recLog{}
	c := newDenyCacher(t, l, "localhost")
	c.CacheURL(42, srv.URL+"/a.css")

	if !l.waitIssue("reason=denied_host", 2*time.Second) {
		t.Fatalf("no denied_host log, got %q", l.issues)
	}
	if n := atomic.LoadInt32(&deniedHits); n != 0 {
		t.Errorf("redirect to denied host was followed %d times", n)
	}
}
