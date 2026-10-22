package scheduler

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

// ---- fakes -----------------------------------------------------------------

type fakeClock struct {
	mu      sync.Mutex
	now     time.Time
	waiters []waiter
}

type waiter struct {
	at time.Time
	ch chan time.Time
}

func newFakeClock() *fakeClock {
	return &fakeClock{now: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) After(d time.Duration) <-chan time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	ch := make(chan time.Time, 1)
	c.waiters = append(c.waiters, waiter{at: c.now.Add(d), ch: ch})
	return ch
}

// advance moves the clock and fires every waiter whose deadline has passed.
func (c *fakeClock) advance(d time.Duration) {
	c.mu.Lock()
	c.now = c.now.Add(d)
	var keep []waiter
	for _, w := range c.waiters {
		if !w.at.After(c.now) {
			w.ch <- c.now
		} else {
			keep = append(keep, w)
		}
	}
	c.waiters = keep
	c.mu.Unlock()
}

func (c *fakeClock) pendingWaiters() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.waiters)
}

// waitForWaiters blocks until at least n After() calls are pending.
func (c *fakeClock) waitForWaiters(t *testing.T, n int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if c.pendingWaiters() >= n {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatalf("timed out waiting for %d pending waiter(s), have %d", n, c.pendingWaiters())
}

type fakeLogger struct {
	mu    sync.Mutex
	warns []string
	errs  []string
}

func (l *fakeLogger) Debug(_ context.Context, m string, a ...interface{}) {}
func (l *fakeLogger) Info(_ context.Context, m string, a ...interface{})  {}
func (l *fakeLogger) Warn(_ context.Context, m string, a ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.warns = append(l.warns, fmt.Sprintf(m, a...))
}
func (l *fakeLogger) Error(_ context.Context, m string, a ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.errs = append(l.errs, fmt.Sprintf(m, a...))
}
func (l *fakeLogger) Fatal(_ context.Context, m string, a ...interface{}) {
	panic(fmt.Sprintf(m, a...))
}

func (l *fakeLogger) warnCount() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.warns)
}

type fakeMetrics struct {
	mu       sync.Mutex
	outcomes map[string]int
}

func newFakeMetrics() *fakeMetrics { return &fakeMetrics{outcomes: map[string]int{}} }
func (m *fakeMetrics) IncreaseRuns(job, outcome string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.outcomes[job+"/"+outcome]++
}
func (m *fakeMetrics) RecordRunDuration(string, float64) {}
func (m *fakeMetrics) SetLastSuccess(string, float64)    {}
func (m *fakeMetrics) List() []prometheus.Collector      { return nil }
func (m *fakeMetrics) count(job, outcome string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.outcomes[job+"/"+outcome]
}

func (m *fakeMetrics) waitCount(t *testing.T, job, outcome string, n int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if m.count(job, outcome) >= n {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s/%s >= %d, have %d", job, outcome, n, m.count(job, outcome))
}

type fakeJob struct {
	name     string
	schedule string
	timeout  time.Duration
	run      func(ctx context.Context) error
	calls    atomic32
}

type atomic32 struct {
	mu sync.Mutex
	n  int
}

func (a *atomic32) inc() {
	a.mu.Lock()
	a.n++
	a.mu.Unlock()
}
func (a *atomic32) get() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.n
}

func (j *fakeJob) Name() string            { return j.name }
func (j *fakeJob) DefaultSchedule() string { return j.schedule }
func (j *fakeJob) RunTimeout() time.Duration {
	return j.timeout
}
func (j *fakeJob) Run(ctx context.Context) error {
	j.calls.inc()
	if j.run != nil {
		return j.run(ctx)
	}
	return nil
}

func (j *fakeJob) waitCalls(t *testing.T, n int) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if j.calls.get() >= n {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatalf("timed out waiting for %d call(s), have %d", n, j.calls.get())
}

func newTestScheduler(t *testing.T, clk *fakeClock, log *fakeLogger, m *fakeMetrics, opts ...Option) *Scheduler {
	t.Helper()
	all := append([]Option{WithClock(clk), WithStopTimeout(time.Hour)}, opts...)
	return New(log, m, all...)
}

// ---- tests ------------------------------------------------------------------

func TestOverlapSkip(t *testing.T) {
	clk, log, m := newFakeClock(), &fakeLogger{}, newFakeMetrics()
	release := make(chan struct{})
	job := &fakeJob{name: "slow", schedule: "@every 1s", run: func(ctx context.Context) error {
		select {
		case <-release:
		case <-ctx.Done():
		}
		return nil
	}}
	s := newTestScheduler(t, clk, log, m)
	if err := s.Register(job); err != nil {
		t.Fatal(err)
	}
	if err := s.Start(); err != nil {
		t.Fatal(err)
	}
	clk.waitForWaiters(t, 1) // loop armed
	clk.advance(time.Second) // first tick -> run starts and blocks
	job.waitCalls(t, 1)
	clk.waitForWaiters(t, 1) // loop re-armed for next tick
	clk.advance(time.Second) // second tick while first run in flight -> skipped
	m.waitCount(t, "slow", "skipped", 1)
	if job.calls.get() != 1 {
		t.Fatalf("want 1 call, got %d", job.calls.get())
	}
	if log.warnCount() == 0 {
		t.Error("want a warning about skipped tick")
	}
	close(release)
	m.waitCount(t, "slow", "success", 1)
	clk.waitForWaiters(t, 1)
	clk.advance(time.Second)
	job.waitCalls(t, 2)
	s.Stop()
}

func TestRunTimeout(t *testing.T) {
	clk, log, m := newFakeClock(), &fakeLogger{}, newFakeMetrics()
	job := &fakeJob{name: "stuck", schedule: "@every 1s", timeout: 10 * time.Millisecond, run: func(ctx context.Context) error {
		<-ctx.Done()
		return ctx.Err()
	}}
	s := newTestScheduler(t, clk, log, m)
	if err := s.Register(job); err != nil {
		t.Fatal(err)
	}
	if err := s.Start(); err != nil {
		t.Fatal(err)
	}
	clk.waitForWaiters(t, 1)
	clk.advance(time.Second)
	m.waitCount(t, "stuck", "timeout", 1)
	// running flag cleared: next tick runs again
	clk.waitForWaiters(t, 1)
	clk.advance(time.Second)
	job.waitCalls(t, 2)
	s.Stop()
}

func TestPanicRecovery(t *testing.T) {
	clk, log, m := newFakeClock(), &fakeLogger{}, newFakeMetrics()
	job := &fakeJob{name: "boom", schedule: "@every 1s", run: func(ctx context.Context) error { panic("kaboom") }}
	s := newTestScheduler(t, clk, log, m)
	if err := s.Register(job); err != nil {
		t.Fatal(err)
	}
	if err := s.Start(); err != nil {
		t.Fatal(err)
	}
	clk.waitForWaiters(t, 1)
	clk.advance(time.Second)
	m.waitCount(t, "boom", "panic", 1)
	if s.Ping(context.Background()) != nil {
		t.Error("scheduler should still be alive after a panic")
	}
	clk.waitForWaiters(t, 1)
	clk.advance(time.Second)
	job.waitCalls(t, 2)
	s.Stop()
}

func TestErrorOutcome(t *testing.T) {
	clk, log, m := newFakeClock(), &fakeLogger{}, newFakeMetrics()
	job := &fakeJob{name: "bad", schedule: "@every 1s", run: func(ctx context.Context) error { return errors.New("nope") }}
	s := newTestScheduler(t, clk, log, m)
	_ = s.Register(job)
	_ = s.Start()
	clk.waitForWaiters(t, 1)
	clk.advance(time.Second)
	m.waitCount(t, "bad", "error", 1)
	s.Stop()
}

func TestOverridesApplied(t *testing.T) {
	clk, log, m := newFakeClock(), &fakeLogger{}, newFakeMetrics()
	o, err := ParseOverrides("a @every 5m, b @hourly, bogus * * * * *", "b, nothere")
	if err != nil {
		t.Fatal(err)
	}
	a := &fakeJob{name: "a", schedule: "* * * * *"}
	b := &fakeJob{name: "b", schedule: "* * * * *"}
	c := &fakeJob{name: "c", schedule: "0 5 * * 1"}
	s := newTestScheduler(t, clk, log, m, WithOverrides(o))
	for _, j := range []Job{a, b, c} {
		if err := s.Register(j); err != nil {
			t.Fatal(err)
		}
	}
	if err := s.Start(); err != nil {
		t.Fatal(err)
	}
	entries := s.Entries()
	want := map[string]EntryInfo{
		"a": {Spec: "@every 5m", Source: "env", Enabled: true},
		"b": {Spec: "@hourly", Source: "env", Enabled: false},
		"c": {Spec: "0 5 * * 1", Source: "default", Enabled: true},
	}
	for _, e := range entries {
		w := want[e.Name]
		if e.Spec != w.Spec || e.Source != w.Source || e.Enabled != w.Enabled {
			t.Errorf("entry %s: got %+v, want %+v", e.Name, e, w)
		}
	}
	// two unknown names (bogus in schedules, nothere in disabled) -> two warnings
	if log.warnCount() != 2 {
		t.Errorf("want 2 warnings about unknown crons, got %d: %v", log.warnCount(), log.warns)
	}
	// only a and c loops are armed
	clk.waitForWaiters(t, 2)
	if clk.pendingWaiters() != 2 {
		t.Errorf("want 2 loops armed, got %d", clk.pendingWaiters())
	}
	s.Stop()
}

func TestRegisterValidation(t *testing.T) {
	clk, log, m := newFakeClock(), &fakeLogger{}, newFakeMetrics()
	s := newTestScheduler(t, clk, log, m)
	if err := s.Register(&fakeJob{name: "Bad-Name", schedule: "* * * * *"}); err == nil {
		t.Error("want error for invalid name")
	}
	if err := s.Register(&fakeJob{name: "x", schedule: "not a cron"}); err == nil {
		t.Error("want error for invalid default schedule")
	}
	if err := s.Register(&fakeJob{name: "ok", schedule: "* * * * *"}); err != nil {
		t.Fatal(err)
	}
	if err := s.Register(&fakeJob{name: "ok", schedule: "* * * * *"}); err == nil {
		t.Error("want error for duplicate name")
	}
	if err := s.Ping(context.Background()); err == nil {
		t.Error("Ping should fail before Start")
	}
	if err := s.Start(); err != nil {
		t.Fatal(err)
	}
	if err := s.Register(&fakeJob{name: "late", schedule: "* * * * *"}); err == nil {
		t.Error("want error for register after start")
	}
	if err := s.Start(); err == nil {
		t.Error("want error for double start")
	}
	s.Stop()
	if err := s.Ping(context.Background()); err == nil {
		t.Error("Ping should fail after Stop")
	}
}

func TestStartWithoutJobs(t *testing.T) {
	s := newTestScheduler(t, newFakeClock(), &fakeLogger{}, newFakeMetrics())
	if err := s.Start(); err == nil {
		t.Error("want error when no jobs registered")
	}
}

func TestStopWaitsForInFlight(t *testing.T) {
	clk, log, m := newFakeClock(), &fakeLogger{}, newFakeMetrics()
	sawCancel := make(chan struct{})
	job := &fakeJob{name: "w", schedule: "@every 1s", run: func(ctx context.Context) error {
		<-ctx.Done()
		close(sawCancel)
		return ctx.Err()
	}}
	s := newTestScheduler(t, clk, log, m)
	_ = s.Register(job)
	_ = s.Start()
	clk.waitForWaiters(t, 1)
	clk.advance(time.Second)
	job.waitCalls(t, 1)
	done := make(chan struct{})
	go func() {
		s.Stop()
		close(done)
	}()
	select {
	case <-sawCancel:
	case <-time.After(2 * time.Second):
		t.Fatal("job did not observe cancellation")
	}
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Stop did not return")
	}
	if m.count("w", "error") != 1 {
		t.Errorf("cancelled run should count as error, got %v", m.outcomes)
	}
	s.Stop() // idempotent
}

func TestRealClockSmoke(t *testing.T) {
	if testing.Short() {
		t.Skip("real clock test")
	}
	log, m := &fakeLogger{}, newFakeMetrics()
	job := &fakeJob{name: "tick", schedule: "@every 1s"}
	s := New(log, m, WithStopTimeout(2*time.Second))
	_ = s.Register(job)
	_ = s.Start()
	time.Sleep(2500 * time.Millisecond)
	s.Stop()
	if n := job.calls.get(); n < 2 {
		t.Errorf("want >= 2 runs in 2.5s, got %d", n)
	}
}
