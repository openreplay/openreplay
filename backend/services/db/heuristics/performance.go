package heuristics

import (
  . "openreplay/backend/pkg/messages"
)


const AGGR_TIME = 15 * 60 * 1000


type valueAggregator struct {
	sum float64
	count float64
}
func (va *valueAggregator) aggregate() uint64 {
	if va.count == 0 {
		return 0
	}
	return uint64(va.sum/va.count)
}

type performanceAggregator struct {
	readyMessageStore
	pa   *IOSPerformanceAggregated
	fps         valueAggregator
	cpu         valueAggregator
	memory      valueAggregator
	battery     valueAggregator
}

func (h *performanceAggregator) build(timestamp uint64) {
	if h.pa == nil {
		return
	}
	h.pa.TimestampEnd = timestamp
	h.pa.AvgFPS = h.fps.aggregate()
	h.pa.AvgCPU = h.cpu.aggregate()
	h.pa.AvgMemory = h.memory.aggregate()
	h.pa.AvgBattery = h.battery.aggregate()

	h.append(h.pa)

	h.pa = &IOSPerformanceAggregated{}
	for _, agg := range []valueAggregator{h.fps, h.cpu, h.memory, h.battery} {
		agg.sum = 0
		agg.count = 0
	}
}

func (h *performanceAggregator) HandleMessage(msg Message) {
	if h.pa == nil {
		h.pa = &IOSPerformanceAggregated{} // TODO: struct type in messages
	}
	switch m := msg.(type) { // TODO: All Timestampe messages
	case *IOSPerformanceEvent:
		if h.pa.TimestampStart == 0 {
			h.pa.TimestampStart = m.Timestamp
		}
		if h.pa.TimestampStart + AGGR_TIME <= m.Timestamp {
			h.build(m.Timestamp)
		}
		switch m.Name {
		case "fps":
			h.fps.count += 1
			h.fps.sum += float64(m.Value)
			if m.Value < h.pa.MinFPS || h.pa.MinFPS == 0 {
				h.pa.MinFPS = m.Value
			}
			if m.Value > h.pa.MaxFPS {
				h.pa.MaxFPS = m.Value
			}
		case "mainThreadCPU":
			h.cpu.count += 1
			h.cpu.sum += float64(m.Value)
			if m.Value < h.pa.MinCPU || h.pa.MinCPU == 0 {
				h.pa.MinCPU = m.Value
			}
			if m.Value > h.pa.MaxCPU {
				h.pa.MaxCPU = m.Value
			}
		case "memoryUsage":
			h.memory.count += 1
			h.memory.sum += float64(m.Value)
			if m.Value < h.pa.MinMemory || h.pa.MinMemory == 0 {
				h.pa.MinMemory = m.Value
			}
			if m.Value > h.pa.MaxMemory {
				h.pa.MaxMemory = m.Value
			}
		case "batteryLevel":
			h.battery.count += 1
			h.battery.sum += float64(m.Value)
			if m.Value < h.pa.MinBattery || h.pa.MinBattery == 0 {
				h.pa.MinBattery = m.Value
			}
			if m.Value > h.pa.MaxBattery {
				h.pa.MaxBattery = m.Value
			}
		}		
	case *IOSSessionEnd:
		h.build(m.Timestamp)
	}
}