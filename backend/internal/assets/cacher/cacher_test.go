package cacher

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/metrics/assets"
	"openreplay/backend/pkg/objectstorage"
)

type logLine struct {
	sessionID interface{}
	msg       string
}

// recLog records every error line with the sessionID found in its ctx; safe for worker goroutines.
type recLog struct {
	mu     sync.Mutex
	errors []logLine
}

func (l *recLog) Debug(context.Context, string, ...interface{}) {}
func (l *recLog) Info(context.Context, string, ...interface{})  {}
func (l *recLog) Warn(context.Context, string, ...interface{})  {}
func (l *recLog) Error(ctx context.Context, m string, a ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.errors = append(l.errors, logLine{ctx.Value("sessionID"), fmt.Sprintf(m, a...)})
}
func (l *recLog) Fatal(context.Context, string, ...interface{}) {}

// waitError polls until an error line containing want appears.
func (l *recLog) waitError(want string, d time.Duration) (logLine, bool) {
	for end := time.Now().Add(d); time.Now().Before(end); time.Sleep(10 * time.Millisecond) {
		l.mu.Lock()
		for _, e := range l.errors {
			if strings.Contains(e.msg, want) {
				l.mu.Unlock()
				return e, true
			}
		}
		l.mu.Unlock()
	}
	return logLine{}, false
}

type nopStore struct{ objectstorage.ObjectStorage }

func (nopStore) GetCreationTime(string) *time.Time { return nil }
func (nopStore) Upload(io.Reader, string, string, string, objectstorage.CompressionType) error {
	return nil
}

func newTestCacher(t *testing.T, l *recLog, cfg config.Config) *cacher {
	t.Helper()
	cfg.AssetsOrigin, cfg.AssetsSizeLimit = "https://cdn.example", 1<<20
	c, err := NewCacher(l, &cfg, nopStore{}, assets.New("t"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(c.Stop)
	return c
}

// Failed requests must be logged with the session they belong to.
func TestFailedRequestLogsSessionID(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	defer srv.Close()

	l := &recLog{}
	c := newTestCacher(t, l, config.Config{})
	c.CacheURL(42, srv.URL+"/a.css")

	e, ok := l.waitError("Error while caching", 2*time.Second)
	if !ok {
		t.Fatalf("no error logged, got %v", l.errors)
	}
	if e.sessionID != uint64(42) {
		t.Errorf("sessionID in ctx = %v, want 42", e.sessionID)
	}
	if !strings.Contains(e.msg, srv.URL+"/a.css") {
		t.Errorf("error %q does not name the URL", e.msg)
	}
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
	c := newTestCacher(t, l, config.Config{AssetsDenyHosts: "example.org, 127.0.0.1"})
	c.CacheURL(42, srv.URL+"/probe-a.css")

	e, ok := l.waitError("Error while caching (permanent, reason=denied_host): ", 2*time.Second)
	if !ok {
		t.Fatalf("no deny log, got %v", l.errors)
	}
	if e.sessionID != uint64(42) {
		t.Errorf("sessionID in ctx = %v, want 42", e.sessionID)
	}
	if n := atomic.LoadInt32(&hits); n != 0 {
		t.Errorf("denied host was fetched %d times", n)
	}
}

// An allowed host must not be able to bounce the cacher to a denied one.
func TestRedirectToDeniedHostIsNotFollowed(t *testing.T) {
	var deniedHits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.Host, "localhost") {
			atomic.AddInt32(&deniedHits, 1)
			return
		}
		http.Redirect(w, r, strings.Replace("http://"+r.Host, "127.0.0.1", "localhost", 1)+"/b.css", http.StatusFound)
	}))
	defer srv.Close()

	l := &recLog{}
	c := newTestCacher(t, l, config.Config{AssetsDenyHosts: "localhost"})
	c.CacheURL(42, srv.URL+"/a.css")

	if _, ok := l.waitError("Error while caching (permanent, reason=denied_host): ", 2*time.Second); !ok {
		t.Fatalf("no deny log, got %v", l.errors)
	}
	if n := atomic.LoadInt32(&deniedHits); n != 0 {
		t.Errorf("redirect to denied host was followed %d times", n)
	}
}
