package web

import (
	"math"

	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/messages/performance"
)

const AggregationWindow = 2 * 60 * 1000

type PerformanceAggregator struct {
	*PerformanceTrackAggr
	lastTimestamp      uint64
	count              float64
	sumFrameRate       float64
	sumTickRate        float64
	sumTotalJSHeapSize float64
	sumUsedJSHeapSize  float64
}

func (b *PerformanceAggregator) start(timestamp uint64) {
	b.PerformanceTrackAggr = &PerformanceTrackAggr{
		TimestampStart: timestamp,
	}
	b.lastTimestamp = timestamp
}

func (b *PerformanceAggregator) reset() {
	b.PerformanceTrackAggr = nil
	b.count = 0
	b.sumFrameRate = 0
	b.sumTickRate = 0
	b.sumTotalJSHeapSize = 0
	b.sumUsedJSHeapSize = 0
	b.lastTimestamp = 0
}

func (b *PerformanceAggregator) Handle(message Message, timestamp uint64) Message {
	switch msg := message.(type) {
	case *PerformanceTrack:
		if b.PerformanceTrackAggr == nil || msg.Frames == -1 || msg.Ticks == -1 {
			pta := b.Build()
			b.start(timestamp)
			return pta
		}

		dt := performance.TimeDiff(timestamp, b.lastTimestamp)
		if dt == 0 {
			return nil // shouldn't happen
		}

		frameRate := performance.FrameRate(msg.Frames, dt)
		tickRate := performance.TickRate(msg.Ticks, dt)

		fps := uint64(math.Round(frameRate))
		cpu := performance.CPURateFromTickRate(tickRate)
		if fps < b.MinFPS || b.MinFPS == 0 {
			b.MinFPS = fps
		}
		if fps > b.MaxFPS {
			b.MaxFPS = fps
		}
		if cpu < b.MinCPU || b.MinCPU == 0 {
			b.MinCPU = cpu
		}
		if cpu > b.MaxCPU {
			b.MaxCPU = cpu
		}
		if msg.TotalJSHeapSize < b.MinTotalJSHeapSize || b.MinTotalJSHeapSize == 0 {
			b.MinTotalJSHeapSize = msg.TotalJSHeapSize
		}
		if msg.TotalJSHeapSize > b.MaxTotalJSHeapSize {
			b.MaxTotalJSHeapSize = msg.TotalJSHeapSize
		}
		if msg.UsedJSHeapSize < b.MinUsedJSHeapSize || b.MinUsedJSHeapSize == 0 {
			b.MinUsedJSHeapSize = msg.UsedJSHeapSize
		}
		if msg.UsedJSHeapSize > b.MaxUsedJSHeapSize {
			b.MaxUsedJSHeapSize = msg.UsedJSHeapSize
		}
		b.sumFrameRate += frameRate
		b.sumTickRate += tickRate
		b.sumTotalJSHeapSize += float64(msg.TotalJSHeapSize)
		b.sumUsedJSHeapSize += float64(msg.UsedJSHeapSize)
		b.count += 1
		b.lastTimestamp = timestamp
	}
	if b.PerformanceTrackAggr != nil &&
		timestamp-b.PerformanceTrackAggr.TimestampStart >= AggregationWindow {
		return b.Build()
	}
	return nil
}

func (b *PerformanceAggregator) Build() Message {
	if b.PerformanceTrackAggr == nil {
		return nil
	}
	if b.count != 0 && b.PerformanceTrackAggr.TimestampStart < b.lastTimestamp { // the last one shouldn't happen
		b.PerformanceTrackAggr.TimestampEnd = b.lastTimestamp
		b.PerformanceTrackAggr.AvgFPS = uint64(math.Round(b.sumFrameRate / b.count))
		b.PerformanceTrackAggr.AvgCPU = 100 - uint64(math.Round(b.sumTickRate*100/b.count))
		b.PerformanceTrackAggr.AvgTotalJSHeapSize = uint64(math.Round(b.sumTotalJSHeapSize / b.count))
		b.PerformanceTrackAggr.AvgUsedJSHeapSize = uint64(math.Round(b.sumUsedJSHeapSize / b.count))
		msg := b.PerformanceTrackAggr
		b.reset()
		return msg
	}
	b.reset()
	return nil
}
