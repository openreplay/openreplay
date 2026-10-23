package license

import (
	"errors"
	"sync"
	"time"

	"openreplay/backend/pkg/env"
)

const invalidRecheckInterval = time.Minute

type Status struct {
	Valid          bool
	ExpirationDate int64
}

type statusCache struct {
	mu         sync.Mutex
	status     Status
	checkedAt  time.Time
	failed     bool
	refreshing bool
	resolve    func(now time.Time) (Status, bool)
}

var current = &statusCache{
	status: Status{ExpirationDate: -1},
	resolve: func(now time.Time) (Status, bool) {
		return resolveStatus(env.String("LICENSE_KEY"), now, validateRemote)
	},
}

func CurrentStatus() Status {
	return current.get(time.Now())
}

func (c *statusCache) due(now time.Time) bool {
	if c.checkedAt.IsZero() {
		return true
	}
	interval := recheckInterval
	if c.failed || c.status.ExpirationDate <= now.UnixMilli() {
		interval = invalidRecheckInterval
	}
	return now.Sub(c.checkedAt) >= interval
}

func (c *statusCache) get(now time.Time) Status {
	c.mu.Lock()
	if c.due(now) && !c.refreshing {
		c.refreshing = true
		c.mu.Unlock()
		s, ok := c.resolve(now)
		c.mu.Lock()
		if ok {
			c.status = s
		}
		c.failed = !ok
		c.checkedAt = now
		c.refreshing = false
	}
	s := c.status
	c.mu.Unlock()
	s.Valid = s.ExpirationDate > now.UnixMilli()
	return s
}

func resolveStatus(license string, now time.Time, remote func(string) (int64, error)) (Status, bool) {
	invalid := Status{ExpirationDate: -1}
	if license == "" {
		return invalid, true
	}
	if IsToken(license) {
		lic, err := Verify(license, now, publicKeys)
		if err != nil {
			return invalid, true
		}
		return Status{ExpirationDate: lic.HardExpiresAt().UnixMilli()}, true
	}
	expiration, err := remote(license)
	if err != nil {
		if errors.Is(err, errRejected) {
			return invalid, true
		}
		return Status{}, false
	}
	return Status{ExpirationDate: expiration}, true
}
