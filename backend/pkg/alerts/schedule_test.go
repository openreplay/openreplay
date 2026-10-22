package alerts

import "testing"

func i64(v int64) *int64 { return &v }

func TestRepetitionBase(t *testing.T) {
	cases := []struct {
		method   string
		cur, prv int
		want     int
		ok       bool
	}{
		{DetectionThreshold, 60, 15, 15, true},
		{DetectionThreshold, 15, 60, 60, true},
		{DetectionChange, 60, 15, 60, true},
		{DetectionChange, 15, 60, 60, true},
		{DetectionChange, 15, 15, 15, true},
		{DetectionThreshold, 15, 45, 45, false},
	}
	for _, tc := range cases {
		a := &AlertToExecute{DetectionMethod: tc.method, Options: OptionsToExecute{CurrentPeriod: tc.cur, PreviousPeriod: tc.prv}}
		got, ok := RepetitionBase(a)
		if got != tc.want || ok != tc.ok {
			t.Errorf("%s cur=%d prev=%d: want (%d,%v) got (%d,%v)", tc.method, tc.cur, tc.prv, tc.want, tc.ok, got, ok)
		}
	}
}

func TestCanCheck(t *testing.T) {
	const createdAt int64 = 1_700_000_000_000
	// previousPeriod 15 -> interval 3 min
	base := func() *AlertToExecute {
		return &AlertToExecute{
			DetectionMethod: DetectionThreshold,
			CreatedAt:       createdAt,
			Options:         OptionsToExecute{CurrentPeriod: 15, PreviousPeriod: 15, RenotifyInterval: 720},
		}
	}
	threeMin := 3 * minuteMs

	cases := []struct {
		name string
		mut  func(a *AlertToExecute)
		now  int64
		want bool
	}{
		{name: "on tick at creation", now: createdAt, want: true},
		{name: "on tick +59s", now: createdAt + 59_000, want: true},
		{name: "off tick +60s", now: createdAt + 60_000, want: false},
		{name: "on tick after one interval", now: createdAt + threeMin, want: true},
		{name: "on tick after k intervals +59s", now: createdAt + 7*threeMin + 59_000, want: true},
		{name: "off tick mid interval", now: createdAt + threeMin + 90_000, want: false},
		{name: "renotify disabled always ok", mut: func(a *AlertToExecute) {
			a.Options.RenotifyInterval = 0
			a.Options.LastNotification = i64(createdAt + threeMin - 1)
		}, now: createdAt + threeMin, want: true},
		{name: "lastNotification zero", mut: func(a *AlertToExecute) { a.Options.LastNotification = i64(0) }, now: createdAt + threeMin, want: true},
		{name: "within renotify window", mut: func(a *AlertToExecute) { a.Options.LastNotification = i64(createdAt) }, now: createdAt + threeMin, want: false},
		{name: "past renotify window", mut: func(a *AlertToExecute) { a.Options.LastNotification = i64(createdAt) }, now: createdAt + 721*minuteMs, want: false /* 721 min from creation: 721 % 3 = 1 -> off tick */},
		{name: "past renotify window on tick", mut: func(a *AlertToExecute) { a.Options.LastNotification = i64(createdAt) }, now: createdAt + 723*minuteMs, want: true},
		{name: "unknown period", mut: func(a *AlertToExecute) { a.Options.PreviousPeriod = 45 }, now: createdAt, want: false},
		{name: "change uses larger current period", mut: func(a *AlertToExecute) { a.DetectionMethod = DetectionChange; a.Options.CurrentPeriod = 60 }, now: createdAt + 3*minuteMs, want: false},
		{name: "change uses larger current period on tick", mut: func(a *AlertToExecute) { a.DetectionMethod = DetectionChange; a.Options.CurrentPeriod = 60 }, now: createdAt + 10*minuteMs, want: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := base()
			if tc.mut != nil {
				tc.mut(a)
			}
			if got := CanCheck(a, tc.now); got != tc.want {
				t.Errorf("want %v got %v", tc.want, got)
			}
		})
	}
}
