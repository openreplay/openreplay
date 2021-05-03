package builder

import (
	"math"

	"openreplay/backend/pkg/messages/performance"
	. "openreplay/backend/pkg/messages"
)


type performanceTrackAggrBuilder struct {
	performanceTrackAggr   *PerformanceTrackAggr
	lastTimestamp     uint64
	count              float64
	sumFrameRate       float64
	sumTickRate        float64
	sumTotalJSHeapSize float64
	sumUsedJSHeapSize  float64
}


func (b *performanceTrackAggrBuilder) start(timestamp uint64) {
	b.performanceTrackAggr = &PerformanceTrackAggr{
		TimestampStart: timestamp,
	}
	b.lastTimestamp = timestamp
}

func (b *performanceTrackAggrBuilder) HandlePerformanceTrack(msg *PerformanceTrack, timestamp uint64) *PerformanceTrackAggr {
	if msg.Frames == -1 || msg.Ticks == -1 || !b.HasInstance() {
		performanceTrackAggr := b.Build()
		b.start(timestamp)
		return performanceTrackAggr
	}

	dt := performance.TimeDiff(timestamp, b.lastTimestamp)
	if dt == 0 {
		return nil // TODO: handle error
	}

	frameRate := performance.FrameRate(msg.Frames, dt)
	tickRate :=  performance.TickRate(msg.Ticks, dt)

	fps := uint64(math.Round(frameRate))
	cpu := performance.CPURateFromTickRate(tickRate)
	if fps < b.performanceTrackAggr.MinFPS || b.performanceTrackAggr.MinFPS == 0 {
		b.performanceTrackAggr.MinFPS = fps
	}
	if fps > b.performanceTrackAggr.MaxFPS {
		b.performanceTrackAggr.MaxFPS = fps
	}
	if cpu < b.performanceTrackAggr.MinCPU || b.performanceTrackAggr.MinCPU == 0 {
		b.performanceTrackAggr.MinCPU = cpu
	}
	if cpu > b.performanceTrackAggr.MaxCPU {
		b.performanceTrackAggr.MaxCPU = cpu
	}
	if msg.TotalJSHeapSize < b.performanceTrackAggr.MinTotalJSHeapSize || b.performanceTrackAggr.MinTotalJSHeapSize == 0 {
		b.performanceTrackAggr.MinTotalJSHeapSize = msg.TotalJSHeapSize
	}
	if msg.TotalJSHeapSize > b.performanceTrackAggr.MaxTotalJSHeapSize {
		b.performanceTrackAggr.MaxTotalJSHeapSize = msg.TotalJSHeapSize
	}
	if msg.UsedJSHeapSize < b.performanceTrackAggr.MinUsedJSHeapSize || b.performanceTrackAggr.MinUsedJSHeapSize == 0 {
		b.performanceTrackAggr.MinUsedJSHeapSize = msg.UsedJSHeapSize
	}
	if msg.UsedJSHeapSize > b.performanceTrackAggr.MaxUsedJSHeapSize {
		b.performanceTrackAggr.MaxUsedJSHeapSize = msg.UsedJSHeapSize
	}
	b.sumFrameRate += frameRate
	b.sumTickRate += tickRate
	b.sumTotalJSHeapSize += float64(msg.TotalJSHeapSize)
	b.sumUsedJSHeapSize += float64(msg.UsedJSHeapSize)
	b.count += 1
	b.lastTimestamp = timestamp
	return nil
}

func (b *performanceTrackAggrBuilder) HasInstance() bool {
	return b.performanceTrackAggr != nil
}

func (b *performanceTrackAggrBuilder) GetStartTimestamp() uint64 {
	if b.performanceTrackAggr == nil {
		return 0
	}
	return b.performanceTrackAggr.TimestampStart;
}

func (b *performanceTrackAggrBuilder) Build() *PerformanceTrackAggr {
	var performanceTrackAggr *PerformanceTrackAggr
	if b.HasInstance() && b.GetStartTimestamp() != b.lastTimestamp && b.count != 0 {
		performanceTrackAggr = b.performanceTrackAggr
		performanceTrackAggr.TimestampEnd = b.lastTimestamp
		performanceTrackAggr.AvgFPS = uint64(math.Round(b.sumFrameRate / b.count))
		performanceTrackAggr.AvgCPU = 100 - uint64(math.Round(b.sumTickRate*100/b.count))
		performanceTrackAggr.AvgTotalJSHeapSize = uint64(math.Round(b.sumTotalJSHeapSize / b.count))
		performanceTrackAggr.AvgUsedJSHeapSize = uint64(math.Round(b.sumUsedJSHeapSize / b.count))
	}
	b.performanceTrackAggr = nil
	b.count = 0
	b.sumFrameRate = 0
	b.sumTickRate = 0
	b.sumTotalJSHeapSize = 0
	b.sumUsedJSHeapSize = 0
	b.lastTimestamp = 0
	return performanceTrackAggr
}

