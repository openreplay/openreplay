package scheduler

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"runtime/debug"
	"sync"
	"sync/atomic"
	"time"

	"github.com/robfig/cron/v3"

	"openreplay/backend/pkg/logger"
	schedulerMetrics "openreplay/backend/pkg/metrics/scheduler"
)

const (
	sourceDefault = "default"
	sourceEnv     = "env"

	defaultRunTimeout  = 10 * time.Minute
	defaultStopTimeout = 25 * time.Second
)

var nameRe = regexp.MustCompile(`^[a-z0-9_]+$`)

type Option func(*Scheduler)

func WithOverrides(o Overrides) Option             { return func(s *Scheduler) { s.overrides = o } }
func WithDefaultRunTimeout(d time.Duration) Option { return func(s *Scheduler) { s.runTimeout = d } }
func WithStopTimeout(d time.Duration) Option       { return func(s *Scheduler) { s.stopTimeout = d } }
func WithClock(c Clock) Option                     { return func(s *Scheduler) { s.clock = c } }

type entry struct {
	job      Job
	spec     string
	source   string
	schedule cron.Schedule
	enabled  bool
	timeout  time.Duration
	running  atomic.Bool
}

// Scheduler runs registered Jobs on their cron schedules. A tick that lands while the
// previous run of the same job is still in flight is skipped, every run is bounded by a
// timeout and recovers from panics, and Stop waits (bounded) for in-flight runs.
type Scheduler struct {
	log         logger.Logger
	metrics     schedulerMetrics.Scheduler
	clock       Clock
	overrides   Overrides
	runTimeout  time.Duration
	stopTimeout time.Duration

	mu      sync.Mutex
	entries []*entry
	names   map[string]*entry
	started bool
	stopped bool
	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup
}

func New(log logger.Logger, metrics schedulerMetrics.Scheduler, opts ...Option) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Scheduler{
		log:         log,
		metrics:     metrics,
		clock:       realClock{},
		overrides:   Overrides{Schedules: map[string]string{}, Disabled: map[string]struct{}{}},
		runTimeout:  defaultRunTimeout,
		stopTimeout: defaultStopTimeout,
		names:       make(map[string]*entry),
		ctx:         ctx,
		cancel:      cancel,
	}
	for _, o := range opts {
		o(s)
	}
	if s.overrides.Schedules == nil {
		s.overrides.Schedules = map[string]string{}
	}
	if s.overrides.Disabled == nil {
		s.overrides.Disabled = map[string]struct{}{}
	}
	return s
}

// Register adds a job. It must be called before Start. Registration order is preserved.
func (s *Scheduler) Register(j Job) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.started {
		return errors.New("scheduler: cannot register a job after Start")
	}
	name := j.Name()
	if !nameRe.MatchString(name) {
		return fmt.Errorf("scheduler: invalid job name %q (must match %s)", name, nameRe.String())
	}
	if _, dup := s.names[name]; dup {
		return fmt.Errorf("scheduler: job %q already registered", name)
	}
	spec, source := j.DefaultSchedule(), sourceDefault
	if override, ok := s.overrides.Schedules[name]; ok {
		spec, source = override, sourceEnv
	}
	schedule, err := cron.ParseStandard(spec)
	if err != nil {
		return fmt.Errorf("scheduler: job %q: invalid schedule %q: %w", name, spec, err)
	}
	timeout := s.runTimeout
	if tj, ok := j.(TimeoutJob); ok && tj.RunTimeout() > 0 {
		timeout = tj.RunTimeout()
	}
	_, disabled := s.overrides.Disabled[name]
	e := &entry{job: j, spec: spec, source: source, schedule: schedule, enabled: !disabled, timeout: timeout}
	s.entries = append(s.entries, e)
	s.names[name] = e
	return nil
}

// Start launches one loop per enabled job.
func (s *Scheduler) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.started {
		return errors.New("scheduler: already started")
	}
	if len(s.entries) == 0 {
		return errors.New("scheduler: no jobs registered")
	}
	s.started = true
	ctx := context.Background()
	known := make([]string, 0, len(s.entries))
	for _, e := range s.entries {
		known = append(known, e.job.Name())
	}
	for name := range s.overrides.Schedules {
		if _, ok := s.names[name]; !ok {
			s.log.Warn(ctx, "CRON_SCHEDULES references unknown cron %q (known: %v)", name, known)
		}
	}
	for name := range s.overrides.Disabled {
		if _, ok := s.names[name]; !ok {
			s.log.Warn(ctx, "CRON_DISABLED references unknown cron %q (known: %v)", name, known)
		}
	}
	enabled := 0
	for _, e := range s.entries {
		name := e.job.Name()
		if !e.enabled {
			if _, overridden := s.overrides.Schedules[name]; overridden {
				s.log.Info(ctx, "cron %q disabled via CRON_DISABLED (CRON_SCHEDULES override ignored)", name)
			} else {
				s.log.Info(ctx, "cron %q disabled via CRON_DISABLED", name)
			}
			continue
		}
		enabled++
		now := s.clock.Now()
		s.log.Info(ctx, "cron %q scheduled %q (source=%s, timeout=%s), next run %s",
			name, e.spec, e.source, e.timeout, e.schedule.Next(now).Format(time.RFC3339))
		s.wg.Add(1)
		go s.loop(e)
	}
	if enabled == 0 {
		s.log.Warn(ctx, "all crons are disabled; scheduler is idle")
	}
	return nil
}

func (s *Scheduler) loop(e *entry) {
	defer s.wg.Done()
	for {
		now := s.clock.Now()
		next := e.schedule.Next(now)
		select {
		case <-s.ctx.Done():
			return
		case <-s.clock.After(next.Sub(now)):
		}
		if s.ctx.Err() != nil {
			return
		}
		s.fire(e, next)
	}
}

func (s *Scheduler) fire(e *entry, scheduledAt time.Time) {
	name := e.job.Name()
	if !e.running.CompareAndSwap(false, true) {
		s.log.Warn(context.Background(), "cron %q: previous run still in progress, skipping tick scheduled at %s",
			name, scheduledAt.Format(time.RFC3339))
		s.metrics.IncreaseRuns(name, schedulerMetrics.OutcomeSkipped)
		return
	}
	s.wg.Add(1)
	go s.runOnce(e)
}

func (s *Scheduler) runOnce(e *entry) {
	defer s.wg.Done()
	defer e.running.Store(false)

	name := e.job.Name()
	ctx, cancel := context.WithTimeout(s.ctx, e.timeout)
	defer cancel()

	start := s.clock.Now()
	outcome := schedulerMetrics.OutcomeSuccess
	var err error

	defer func() {
		if r := recover(); r != nil {
			outcome = schedulerMetrics.OutcomePanic
			s.log.Error(ctx, "cron %q panicked: %v\n%s", name, r, debug.Stack())
		}
		dur := s.clock.Now().Sub(start)
		s.metrics.RecordRunDuration(name, float64(dur.Milliseconds()))
		s.metrics.IncreaseRuns(name, outcome)
		switch outcome {
		case schedulerMetrics.OutcomeSuccess:
			s.metrics.SetLastSuccess(name, float64(s.clock.Now().Unix()))
			s.log.Info(ctx, "cron %q finished in %s", name, dur)
		case schedulerMetrics.OutcomeTimeout:
			s.log.Error(ctx, "cron %q timed out after %s: %s", name, dur, err)
		case schedulerMetrics.OutcomeError:
			if errors.Is(err, context.Canceled) {
				s.log.Warn(ctx, "cron %q cancelled by shutdown after %s", name, dur)
			} else {
				s.log.Error(ctx, "cron %q failed after %s: %s", name, dur, err)
			}
		}
	}()

	s.log.Info(ctx, "cron %q started", name)
	err = e.job.Run(ctx)
	switch {
	case err == nil:
		outcome = schedulerMetrics.OutcomeSuccess
	case errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded):
		outcome = schedulerMetrics.OutcomeTimeout
	default:
		outcome = schedulerMetrics.OutcomeError
	}
}

// Stop cancels every loop and in-flight run and waits for them, bounded by the stop timeout.
// It is idempotent and satisfies terminator.ServiceStopper / service.Interface.
func (s *Scheduler) Stop() {
	s.mu.Lock()
	if s.stopped {
		s.mu.Unlock()
		return
	}
	s.stopped = true
	s.mu.Unlock()

	s.cancel()
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-s.clock.After(s.stopTimeout):
		s.log.Warn(context.Background(), "scheduler: run(s) still in flight after %s, exiting anyway", s.stopTimeout)
	}
}

// Ping reports the scheduler as healthy while it is started and not stopped.
func (s *Scheduler) Ping(_ context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.started {
		return errors.New("scheduler not started")
	}
	if s.stopped {
		return errors.New("scheduler stopped")
	}
	return nil
}

// Entries returns a snapshot of (name, spec, source, enabled) for logging and tests.
type EntryInfo struct {
	Name    string
	Spec    string
	Source  string
	Enabled bool
	Timeout time.Duration
}

func (s *Scheduler) Entries() []EntryInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]EntryInfo, 0, len(s.entries))
	for _, e := range s.entries {
		out = append(out, EntryInfo{Name: e.job.Name(), Spec: e.spec, Source: e.source, Enabled: e.enabled, Timeout: e.timeout})
	}
	return out
}
