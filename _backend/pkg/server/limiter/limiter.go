package limiter

import (
	"sync"
	"time"

	"openreplay/backend/internal/config/common"
)

type rateLimiter struct {
	rate      int
	burst     int
	tokens    int
	lastToken time.Time
	lastUsed  time.Time
	mu        sync.Mutex
}

func newRateLimiter(rate int, burst int) *rateLimiter {
	return &rateLimiter{
		rate:      rate,
		burst:     burst,
		tokens:    burst,
		lastToken: time.Now(),
		lastUsed:  time.Now(),
	}
}

func (rl *rateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastToken)

	rl.tokens += int(elapsed.Seconds()) * rl.rate
	if rl.tokens > rl.burst {
		rl.tokens = rl.burst
	}

	rl.lastToken = now
	rl.lastUsed = now

	if rl.tokens > 0 {
		rl.tokens--
		return true
	}
	return false
}

type UserRateLimiter struct {
	rateLimiters    sync.Map
	rate            int
	burst           int
	cleanupInterval time.Duration
	maxIdleTime     time.Duration
}

func NewUserRateLimiter(cfg *common.RateLimiter) (*UserRateLimiter, error) {
	url := &UserRateLimiter{
		rate:            cfg.Rate,
		burst:           cfg.Burst,
		cleanupInterval: cfg.CleanupInterval,
		maxIdleTime:     cfg.MaxIdleTime,
	}
	go url.cleanup()
	return url, nil
}

func (url *UserRateLimiter) getRateLimiter(user uint64) *rateLimiter {
	value, _ := url.rateLimiters.LoadOrStore(user, newRateLimiter(url.rate, url.burst))
	return value.(*rateLimiter)
}

func (url *UserRateLimiter) cleanup() {
	for {
		time.Sleep(url.cleanupInterval)
		now := time.Now()

		url.rateLimiters.Range(func(key, value interface{}) bool {
			rl := value.(*rateLimiter)
			rl.mu.Lock()
			if now.Sub(rl.lastUsed) > url.maxIdleTime {
				url.rateLimiters.Delete(key)
			}
			rl.mu.Unlock()
			return true
		})
	}
}
