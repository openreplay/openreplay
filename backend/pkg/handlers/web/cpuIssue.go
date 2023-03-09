package web

import (
	"encoding/json"
	"log"

	. "openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/messages/performance"
)

/*
	Handler name: CpuIssue
	Input events: PerformanceTrack,
				  SetPageLocation
	Output event: IssueEvent
*/

const CpuThreshold = 70 // % out of 100
const CpuMinDurationTrigger = 6 * 1000

type CpuIssueDetector struct {
	startTimestamp uint64
	startMessageID uint64
	lastTimestamp  uint64
	maxRate        uint64
	contextString  string
}

func (f *CpuIssueDetector) createPayload() string {
	p, err := json.Marshal(struct {
		Duration uint64
		Rate     uint64
	}{f.duration(), f.maxRate})
	if err != nil {
		log.Printf("can't marshal CpuIssue payload to json: %s", err)
	}
	return string(p)
}

func (f *CpuIssueDetector) duration() uint64 {
	return f.lastTimestamp - f.startTimestamp
}

func (f *CpuIssueDetector) reset() {
	f.startTimestamp = 0
	f.startMessageID = 0
	f.maxRate = 0
}

func (f *CpuIssueDetector) Build() Message {
	defer f.reset()
	if f.startTimestamp == 0 || f.duration() < CpuMinDurationTrigger {
		return nil
	}
	return &IssueEvent{
		Type:          "cpu",
		Timestamp:     f.startTimestamp,
		MessageID:     f.startMessageID,
		ContextString: f.contextString,
		Payload:       f.createPayload(),
	}
}

func (f *CpuIssueDetector) Handle(message Message, timestamp uint64) Message {
	switch msg := message.(type) {
	case *PerformanceTrack:
		// Ignore if it's a wrong message order
		if timestamp < f.lastTimestamp {
			return nil
		}
		f.lastTimestamp = timestamp
		cpuRate := performance.CPURate(msg.Ticks, performance.TimeDiff(timestamp, f.lastTimestamp))
		// Build event if cpu issue have gone
		if msg.Frames == -1 || msg.Ticks == -1 || cpuRate < CpuThreshold {
			return f.Build()
		}
		// Update values
		if f.startTimestamp == 0 {
			f.startTimestamp = timestamp
			f.startMessageID = message.MsgID()
		}
		if f.maxRate < cpuRate {
			f.maxRate = cpuRate
		}
	case *SetPageLocation:
		f.contextString = msg.URL
	}
	return nil
}
