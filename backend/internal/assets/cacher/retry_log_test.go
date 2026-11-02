package cacher

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	config "openreplay/backend/internal/config/assets"
	"openreplay/backend/pkg/metrics/assets"
	"openreplay/backend/pkg/objectstorage"
)

type recLog struct{ debug []string }

func (l *recLog) Debug(_ context.Context, m string, a ...interface{}) {
	l.debug = append(l.debug, fmt.Sprintf(m, a...))
}
func (l *recLog) Info(context.Context, string, ...interface{})  {}
func (l *recLog) Warn(context.Context, string, ...interface{})  {}
func (l *recLog) Error(context.Context, string, ...interface{}) {}
func (l *recLog) Fatal(context.Context, string, ...interface{}) {}

type nopStore struct{ objectstorage.ObjectStorage }

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
