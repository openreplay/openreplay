package performance

import (
	"math"
)

func TimeDiff(t1 uint64, t2 uint64) uint64 {
	if t1 < t2 {
		return 0
	}
	return t1 - t2
}

func FrameRate(frames int64, dt uint64) float64 {
	return float64(frames) * 1000 / float64(dt)
}

func TickRate(ticks int64, dt uint64) float64 {
	tickRate := float64(ticks) * 30 / float64(dt)
	if tickRate > 1 {
		tickRate = 1
	}
	return tickRate
}

func CPURateFromTickRate(tickRate float64) uint64 {
	return 100 - uint64(math.Round(tickRate*100))
}

func CPURate(ticks int64, dt uint64) uint64 {
	return CPURateFromTickRate(TickRate(ticks, dt))
}
