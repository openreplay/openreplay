package builder

import (
	. "openreplay/backend/pkg/messages"
)

type pageEventBuilder struct {
	pageEvent                   *PageEvent
	firstTimingHandled      bool
}

func (b *pageEventBuilder) buildIfTimingsComplete() *PageEvent {
	if b.firstTimingHandled {
		return b.Build()
	}
	b.firstTimingHandled = true
	return nil
}

// Only for Loaded: true
func (b *pageEventBuilder) HandleSetPageLocation(msg *SetPageLocation, messageID uint64, timestamp uint64) {
	b.pageEvent = &PageEvent{
		URL:       msg.URL,
		Referrer:  msg.Referrer,
		Loaded:    true,
		MessageID: messageID,
		Timestamp: timestamp,
	}
}

func (b * pageEventBuilder) HandlePageLoadTiming(msg *PageLoadTiming) *PageEvent {
	if !b.HasInstance() {
		return nil
	}
	if msg.RequestStart <= 30000 {
		b.pageEvent.RequestStart = msg.RequestStart
	}
	if msg.ResponseStart <= 30000 {
		b.pageEvent.ResponseStart = msg.ResponseStart
	}
	if msg.ResponseEnd <= 30000 {
		b.pageEvent.ResponseEnd = msg.ResponseEnd
	}
	if msg.DomContentLoadedEventStart <= 30000 {
		b.pageEvent.DomContentLoadedEventStart = msg.DomContentLoadedEventStart
	}
	if msg.DomContentLoadedEventEnd <= 30000 {
		b.pageEvent.DomContentLoadedEventEnd = msg.DomContentLoadedEventEnd
	}
	if msg.LoadEventStart <= 30000 {
		b.pageEvent.LoadEventStart = msg.LoadEventStart
	}
	if msg.LoadEventEnd <= 30000 {
		b.pageEvent.LoadEventEnd = msg.LoadEventEnd
	}
	if msg.FirstPaint <= 30000 {
		b.pageEvent.FirstPaint = msg.FirstPaint
	}
	if msg.FirstContentfulPaint <= 30000 {
		b.pageEvent.FirstContentfulPaint = msg.FirstContentfulPaint
	}
	return b.buildIfTimingsComplete()
}

func (b * pageEventBuilder) HandlePageRenderTiming(msg *PageRenderTiming) *PageEvent {
	if !b.HasInstance() {
		return nil
	}
	b.pageEvent.SpeedIndex = msg.SpeedIndex
	b.pageEvent.VisuallyComplete = msg.VisuallyComplete
	b.pageEvent.TimeToInteractive = msg.TimeToInteractive
	return b.buildIfTimingsComplete()
}

func (b *pageEventBuilder) HasInstance() bool {
	return b.pageEvent != nil
}

func (b * pageEventBuilder) GetTimestamp() uint64 {
	if b.pageEvent == nil {
		return 0
	}
	return b.pageEvent.Timestamp;
}

func (b * pageEventBuilder) Build() *PageEvent {
	pageEvent := b.pageEvent
	b.pageEvent = nil
	b.firstTimingHandled = false
	return pageEvent
}