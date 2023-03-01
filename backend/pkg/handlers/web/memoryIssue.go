package web

import (
	"encoding/json"
	"log"
	"math"

	. "openreplay/backend/pkg/messages"
)

const MIN_COUNT = 3
const MEM_RATE_THRESHOLD = 300 // % to average

type MemoryIssueDetector struct {
	startMessageID uint64
	startTimestamp uint64
	rate           int
	count          float64
	sum            float64
	contextString  string
}

func (f *MemoryIssueDetector) reset() {
	f.startTimestamp = 0
	f.startMessageID = 0
	f.rate = 0
}

func (f *MemoryIssueDetector) Build() Message {
	if f.startTimestamp == 0 {
		return nil
	}
	payload, err := json.Marshal(struct{ Rate int }{f.rate - 100})
	if err != nil {
		log.Printf("can't marshal MemoryIssue payload to json: %s", err)
	}
	event := &IssueEvent{
		Type:          "memory",
		Timestamp:     f.startTimestamp,
		MessageID:     f.startMessageID,
		ContextString: f.contextString,
		Payload:       string(payload),
	}
	f.reset()
	return event
}

func (f *MemoryIssueDetector) Handle(message Message, timestamp uint64) Message {
	switch msg := message.(type) {
	case *PerformanceTrack:
		if f.count < MIN_COUNT {
			f.sum += float64(msg.UsedJSHeapSize)
			f.count++
			return nil
		}

		average := f.sum / f.count
		rate := int(math.Round(float64(msg.UsedJSHeapSize) / average * 100))

		f.sum += float64(msg.UsedJSHeapSize)
		f.count++

		if rate >= MEM_RATE_THRESHOLD {
			if f.startTimestamp == 0 {
				f.startTimestamp = timestamp
				f.startMessageID = message.MsgID()
			}
			if f.rate < rate {
				f.rate = rate
			}
		} else {
			return f.Build()
		}
	case *SetPageLocation:
		f.contextString = msg.URL
	}
	return nil
}
