package alerts

// repetitionInterval maps a period (minutes) to how often (minutes) an alert with that
// period is checked. Port of alerts/modules/helpers.TimeInterval.
var repetitionInterval = map[int]int{15: 3, 30: 5, 60: 10, 120: 20, 240: 30, 1440: 60}

const minuteMs int64 = 60_000

// RepetitionBase returns the period that drives the check cadence and whether it is known.
func RepetitionBase(a *AlertToExecute) (int, bool) {
	base := a.Options.PreviousPeriod
	if a.DetectionMethod == DetectionChange && a.Options.CurrentPeriod > a.Options.PreviousPeriod {
		base = a.Options.CurrentPeriod
	}
	_, ok := repetitionInterval[base]
	return base, ok
}

// CanCheck is an exact port of helpers.can_check: an alert is evaluated only when the
// renotify window has elapsed and the current minute lines up with the alert's cadence
// (measured from its creation time). It assumes the cron ticks once per minute.
func CanCheck(a *AlertToExecute, nowMs int64) bool {
	base, ok := RepetitionBase(a)
	if !ok {
		return false
	}
	interval := int64(repetitionInterval[base]) * minuteMs

	renotifyOK := a.Options.RenotifyInterval <= 0 ||
		a.Options.LastNotification == nil ||
		*a.Options.LastNotification <= 0 ||
		nowMs-*a.Options.LastNotification > int64(a.Options.RenotifyInterval)*minuteMs

	onTick := (nowMs-a.CreatedAt)%interval < minuteMs
	return renotifyOK && onTick
}
