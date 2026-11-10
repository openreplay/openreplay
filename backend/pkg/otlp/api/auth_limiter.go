package api

import (
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/time/rate"
)

const (
	failureEntryIdle   = 10 * time.Minute
	failureCleanupTick = time.Minute
)

type failureLimiter struct {
	perIP   rate.Limit
	ipBurst int
	global  *rate.Limiter
	ips     sync.Map
}

type ipFailures struct {
	limiter  *rate.Limiter
	lastSeen atomic.Int64
}

func newFailureLimiter(perIPPerMinute, ipBurst, globalPerSecond int) *failureLimiter {
	if perIPPerMinute <= 0 && globalPerSecond <= 0 {
		return nil
	}
	l := &failureLimiter{ipBurst: ipBurst}
	if perIPPerMinute > 0 {
		l.perIP = rate.Limit(float64(perIPPerMinute) / 60)
	}
	if globalPerSecond > 0 {
		l.global = rate.NewLimiter(rate.Limit(globalPerSecond), 2*globalPerSecond)
	}
	return l
}

func (l *failureLimiter) runCleanup() {
	for now := range time.Tick(failureCleanupTick) {
		l.cleanup(now)
	}
}

// blocked returns how long the caller must wait before another key check is allowed.
func (l *failureLimiter) blocked(ip string, now time.Time) time.Duration {
	if l == nil {
		return 0
	}
	var delay time.Duration
	if l.global != nil {
		delay = untilOneToken(l.global, now)
	}
	if l.perIP > 0 {
		if v, ok := l.ips.Load(ip); ok {
			delay = max(delay, untilOneToken(v.(*ipFailures).limiter, now))
		}
	}
	return delay
}

func (l *failureLimiter) record(ip string, now time.Time) {
	if l == nil {
		return
	}
	if l.global != nil {
		l.global.AllowN(now, 1)
	}
	if l.perIP > 0 {
		v, ok := l.ips.Load(ip)
		if !ok {
			v, _ = l.ips.LoadOrStore(ip, &ipFailures{limiter: rate.NewLimiter(l.perIP, l.ipBurst)})
		}
		entry := v.(*ipFailures)
		entry.lastSeen.Store(now.UnixNano())
		entry.limiter.AllowN(now, 1)
	}
}

func (l *failureLimiter) cleanup(now time.Time) {
	l.ips.Range(func(key, value any) bool {
		if now.Sub(time.Unix(0, value.(*ipFailures).lastSeen.Load())) > failureEntryIdle {
			l.ips.Delete(key)
		}
		return true
	})
}

func untilOneToken(lim *rate.Limiter, now time.Time) time.Duration {
	tokens := lim.TokensAt(now)
	if tokens >= 1 {
		return 0
	}
	return time.Duration((1 - tokens) / float64(lim.Limit()) * float64(time.Second))
}
