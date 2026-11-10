package api

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type projectLimiter struct {
	bytesPerSec int64
	burst       int64
	limiters    sync.Map
}

func newProjectLimiter(bytesPerSec, burst int64) *projectLimiter {
	if bytesPerSec <= 0 {
		return nil
	}
	return &projectLimiter{bytesPerSec: bytesPerSec, burst: burst}
}

// wait returns how long the project has to wait before it may send n more bytes; zero means the bytes are accepted.
func (l *projectLimiter) wait(projectID uint32, n int64, now time.Time) time.Duration {
	if l == nil {
		return 0
	}
	v, ok := l.limiters.Load(projectID)
	if !ok {
		v, _ = l.limiters.LoadOrStore(projectID, rate.NewLimiter(rate.Limit(l.bytesPerSec), int(l.burst)))
	}
	r := v.(*rate.Limiter).ReserveN(now, int(n))
	delay := r.DelayFrom(now)
	if delay > 0 {
		r.CancelAt(now)
	}
	return delay
}
