package limiter

import (
	"sync"
	"time"
)

type RateLimiter struct {
	rate      int
	burst     int
	tokens    int
	lastToken time.Time
	lastUsed  time.Time
	mu        sync.Mutex
}

func NewRateLimiter(rate int, burst int) *RateLimiter {
	return &RateLimiter{
		rate:      rate,
		burst:     burst,
		tokens:    burst,
		lastToken: time.Now(),
		lastUsed:  time.Now(),
	}
}

func (rl *RateLimiter) Allow() bool {
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

func NewUserRateLimiter(rate int, burst int, cleanupInterval time.Duration, maxIdleTime time.Duration) *UserRateLimiter {
	url := &UserRateLimiter{
		rate:            rate,
		burst:           burst,
		cleanupInterval: cleanupInterval,
		maxIdleTime:     maxIdleTime,
	}
	go url.cleanup()
	return url
}

func (url *UserRateLimiter) GetRateLimiter(user uint64) *RateLimiter {
	value, _ := url.rateLimiters.LoadOrStore(user, NewRateLimiter(url.rate, url.burst))
	return value.(*RateLimiter)
}

func (url *UserRateLimiter) cleanup() {
	for {
		time.Sleep(url.cleanupInterval)
		now := time.Now()

		url.rateLimiters.Range(func(key, value interface{}) bool {
			rl := value.(*RateLimiter)
			rl.mu.Lock()
			if now.Sub(rl.lastUsed) > url.maxIdleTime {
				url.rateLimiters.Delete(key)
			}
			rl.mu.Unlock()
			return true
		})
	}
}
