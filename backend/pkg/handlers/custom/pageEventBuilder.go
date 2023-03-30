package custom

import (
	. "openreplay/backend/pkg/messages"
)

const PageEventTimeout = 1 * 60 * 1000

type pageEventBuilder struct {
	pageEvent          *PageEvent
	firstTimingHandled bool
}

func NewPageEventBuilder() *pageEventBuilder {
	ieBuilder := &pageEventBuilder{}
	return ieBuilder
}

func (b *pageEventBuilder) Handle(message Message, timestamp uint64) Message {
	switch msg := message.(type) {
	case *SetPageLocation:
		if msg.NavigationStart == 0 { // routing without new page loading
			return &PageEvent{
				URL:       msg.URL,
				Referrer:  msg.Referrer,
				Loaded:    false,
				MessageID: message.MsgID(),
				Timestamp: timestamp,
			}
		} else {
			pageEvent := b.Build()
			b.pageEvent = &PageEvent{
				URL:       msg.URL,
				Referrer:  msg.Referrer,
				Loaded:    true,
				MessageID: message.MsgID(),
				Timestamp: timestamp,
			}
			return pageEvent
		}
	case *PageLoadTiming:
		if b.pageEvent == nil {
			break
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
	case *PageRenderTiming:
		if b.pageEvent == nil {
			break
		}
		b.pageEvent.SpeedIndex = msg.SpeedIndex
		b.pageEvent.VisuallyComplete = msg.VisuallyComplete
		b.pageEvent.TimeToInteractive = msg.TimeToInteractive
		return b.buildIfTimingsComplete()

	}

	if b.pageEvent != nil && b.pageEvent.Timestamp+PageEventTimeout < timestamp {
		return b.Build()
	}
	return nil
}

func (b *pageEventBuilder) Build() Message {
	if b.pageEvent == nil {
		return nil
	}
	pageEvent := b.pageEvent
	b.pageEvent = nil
	b.firstTimingHandled = false
	return pageEvent
}

func (b *pageEventBuilder) buildIfTimingsComplete() Message {
	if b.firstTimingHandled {
		return b.Build()
	}
	b.firstTimingHandled = true
	return nil
}
