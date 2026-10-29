package cacher

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"testing"
	"time"

	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/metrics/assets"
	"openreplay/backend/pkg/objectstorage"
)

// recLog records debug lines and, separately, every warn/error line; safe for worker goroutines.
type recLog struct {
	mu     sync.Mutex
	debug  []string
	issues []string
}

func (l *recLog) Debug(_ context.Context, m string, a ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.debug = append(l.debug, fmt.Sprintf(m, a...))
}
func (l *recLog) issue(m string, a ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.issues = append(l.issues, fmt.Sprintf(m, a...))
}
func (l *recLog) Info(context.Context, string, ...interface{})        {}
func (l *recLog) Warn(_ context.Context, m string, a ...interface{})  { l.issue(m, a...) }
func (l *recLog) Error(_ context.Context, m string, a ...interface{}) { l.issue(m, a...) }
func (l *recLog) Fatal(context.Context, string, ...interface{})       {}

// waitIssue polls until a warn/error line containing want appears.
func (l *recLog) waitIssue(want string, d time.Duration) bool {
	for end := time.Now().Add(d); time.Now().Before(end); time.Sleep(10 * time.Millisecond) {
		l.mu.Lock()
		for _, s := range l.issues {
			if strings.Contains(s, want) {
				l.mu.Unlock()
				return true
			}
		}
		l.mu.Unlock()
	}
	return false
}

type nopStore struct{ objectstorage.ObjectStorage }

func (nopStore) GetCreationTime(string) *time.Time { return nil }
func (nopStore) Upload(io.Reader, string, string, string, objectstorage.CompressionType) error {
	return nil
}

// Non-final failures are retried silently at Info level; with DEBUG=true each attempt must be visible.
func TestRetryLogsEachAttemptAtDebug(t *testing.T) {
	l := &recLog{}
	cfg := &config.Config{
		AssetsOrigin: "https://cdn.example", AssetsRetries: 5, AssetsRetryBaseMs: 10, AssetsRetryMaxMs: 10,
		AssetsRetryHeapLimit: 10, AssetsWorkerCount: 1, AssetsQueueSize: 1, AssetsPerHostLimit: 1,
	}
	cfg.KeyScheme = "daily"
	c, err := NewCacher(l, cfg, nopStore{}, assets.New("t"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Stop()

	task := &Task{requestURL: "https://probe.invalid/a.css", urlContext: "https://probe.invalid/a.css", sessionID: 42}
	c.retry(context.Background(), task, 0, "network", errors.New("no such host"))

	if len(l.debug) != 1 {
		t.Fatalf("want 1 debug line, got %d: %v", len(l.debug), l.debug)
	}
	for _, want := range []string{"attempt=1/5", "reason=network", "https://probe.invalid/a.css", "no such host"} {
		if !strings.Contains(l.debug[0], want) {
			t.Errorf("debug line %q missing %q", l.debug[0], want)
		}
	}
}
