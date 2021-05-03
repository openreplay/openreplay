package builder

import (
	"encoding/json"

	"openreplay/backend/pkg/messages/performance"
	. "openreplay/backend/pkg/messages"
)

const CPU_THRESHOLD = 70  // % out of 100 
const CPU_MIN_DURATION_TRIGGER = 6 * 1000


type cpuIssueFinder struct {
	startTimestamp uint64
	startMessageID uint64
	lastTimestamp     uint64
	maxRate uint64
	contextString string
}

func (f *cpuIssueFinder) Build() *IssueEvent {
	if f.startTimestamp == 0 {
		return nil
	}
	duration := f.lastTimestamp - f.startTimestamp
	timestamp := f.startTimestamp
	messageID := f.startMessageID
	maxRate := f.maxRate

	f.startTimestamp = 0
	f.startMessageID = 0
	f.maxRate = 0
	if duration < CPU_MIN_DURATION_TRIGGER {
		return nil
	}

	payload, _ := json.Marshal(struct{
		Duration uint64
		Rate uint64
	}{duration,maxRate})
	return &IssueEvent{
		Type: "cpu",
		Timestamp: timestamp,
		MessageID: messageID,
		ContextString: f.contextString,
		Payload: string(payload),
	}
}

func (f *cpuIssueFinder) HandleSetPageLocation(msg *SetPageLocation) {
	f.contextString = msg.URL
}



func (f *cpuIssueFinder) HandlePerformanceTrack(msg *PerformanceTrack, messageID uint64, timestamp uint64) *IssueEvent {
	dt := performance.TimeDiff(timestamp, f.lastTimestamp)
	if dt == 0 {
		return nil // TODO: handle error
	}

	f.lastTimestamp = timestamp

	if msg.Frames == -1 || msg.Ticks == -1 {
		return f.Build()
	}

	cpuRate := performance.CPURate(msg.Ticks, dt)

	if cpuRate >= CPU_THRESHOLD {
		if f.startTimestamp == 0 {
			f.startTimestamp = timestamp
			f.startMessageID = messageID
		}
		if f.maxRate < cpuRate {
			f.maxRate = cpuRate
		}
	} else {
		return f.Build()
	}

	return nil
}


