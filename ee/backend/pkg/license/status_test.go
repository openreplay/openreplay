package license

import (
	"errors"
	"testing"
	"time"
)

func TestResolveStatus(t *testing.T) {
	now := time.UnixMilli(1_800_000_000_000)
	tests := []struct {
		name     string
		license  string
		remote   func(string) (int64, error)
		want     Status
		wantKeep bool
	}{
		{"no license", "", nil, Status{ExpirationDate: -1}, false},
		{"remote valid", "abc", func(string) (int64, error) { return 1_900_000_000_000, nil }, Status{ExpirationDate: 1_900_000_000_000}, false},
		{"remote rejected", "abc", func(string) (int64, error) { return 0, errRejected }, Status{ExpirationDate: -1}, false},
		{"remote unreachable keeps state", "abc", func(string) (int64, error) { return 0, errors.New("timeout") }, Status{}, true},
		{"bad token", TokenPrefix + ".garbage", nil, Status{ExpirationDate: -1}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := resolveStatus(tt.license, now, tt.remote)
			if ok == tt.wantKeep {
				t.Fatalf("got ok=%v, want ok=%v", ok, !tt.wantKeep)
			}
			if ok && got != tt.want {
				t.Fatalf("got %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestStatusCacheRechecksAfterInterval(t *testing.T) {
	now := time.UnixMilli(1_800_000_000_000)
	calls := 0
	c := &statusCache{
		status: Status{ExpirationDate: -1},
		resolve: func(time.Time) (Status, bool) {
			calls++
			if calls == 2 {
				return Status{}, false
			}
			return Status{ExpirationDate: now.Add(48 * time.Hour).UnixMilli()}, true
		},
	}

	if s := c.get(now); !s.Valid || calls != 1 {
		t.Fatalf("expected a valid first check, got %+v after %d calls", s, calls)
	}
	if s := c.get(now.Add(time.Hour)); !s.Valid || calls != 1 {
		t.Fatalf("expected the cached status within the interval, got %+v after %d calls", s, calls)
	}
	if s := c.get(now.Add(recheckInterval)); !s.Valid || calls != 2 {
		t.Fatalf("expected a recheck that keeps the last state on transport errors, got %+v after %d calls", s, calls)
	}
	if s := c.get(now.Add(72 * time.Hour)); s.Valid {
		t.Fatalf("expected the license to read as expired once the expiration passes, got %+v", s)
	}
}

func TestStatusCacheRetriesQuicklyAfterFailure(t *testing.T) {
	now := time.UnixMilli(1_800_000_000_000)
	calls := 0
	c := &statusCache{
		status: Status{ExpirationDate: -1},
		resolve: func(time.Time) (Status, bool) {
			calls++
			if calls == 1 {
				return Status{}, false
			}
			return Status{ExpirationDate: now.Add(48 * time.Hour).UnixMilli()}, true
		},
	}

	if s := c.get(now); s.Valid {
		t.Fatalf("an unreachable license server on the first check must read as invalid, got %+v", s)
	}
	if s := c.get(now.Add(30 * time.Second)); s.Valid || calls != 1 {
		t.Fatalf("expected no retry before the short interval, got %+v after %d calls", s, calls)
	}
	if s := c.get(now.Add(invalidRecheckInterval)); !s.Valid || calls != 2 {
		t.Fatalf("expected a retry after the short interval, got %+v after %d calls", s, calls)
	}
}

func TestCurrentStatusWithoutLicenseKey(t *testing.T) {
	t.Setenv("LICENSE_KEY", "")
	c := &statusCache{status: Status{ExpirationDate: -1}, resolve: current.resolve}
	if s := c.get(time.Now()); s.Valid || s.ExpirationDate != -1 {
		t.Fatalf("a missing license key must read as invalid, got %+v", s)
	}
}

func TestFirstStatusWaitsForResolution(t *testing.T) {
	now := time.UnixMilli(1_800_000_000_000)
	release := make(chan struct{})
	c := &statusCache{
		status: Status{ExpirationDate: -1},
		resolve: func(time.Time) (Status, bool) {
			<-release
			return Status{ExpirationDate: now.Add(time.Hour).UnixMilli()}, true
		},
	}
	results := make(chan Status, 2)
	go func() { results <- c.get(now) }()
	go func() { results <- c.get(now) }()
	time.Sleep(20 * time.Millisecond)
	close(release)
	for i := 0; i < 2; i++ {
		if s := <-results; !s.Valid {
			t.Fatalf("callers must wait for the first license check, got %+v", s)
		}
	}
}
