package custom

import (
	"encoding/json"
	"fmt"
	. "openreplay/backend/pkg/messages"
)

const PageEventTimeout = 1 * 60 * 1000
const maxLoadTiming = 30000

type pageEventBuilder struct {
	pageEvent *PageEvent
	webVitals map[string]string
}

func NewPageEventBuilder() *pageEventBuilder {
	ieBuilder := &pageEventBuilder{}
	return ieBuilder
}

func (b *pageEventBuilder) MessageTypes() []int {
	return []int{
		MsgSetPageLocation,
		MsgPageLoadTiming,
		MsgPageRenderTiming,
		MsgWebVitals,
	}
}

func (b *pageEventBuilder) Handle(message Message, timestamp uint64) Message {
	switch message.TypeID() {
	case MsgSetPageLocation:
		msg, ok := message.Decode().(*SetPageLocation)
		if !ok {
			return nil
		}
		if msg.NavigationStart == 0 { // routing without new page loading
			pageEvent := &PageEvent{
				URL:       msg.URL,
				Referrer:  msg.Referrer,
				Loaded:    false,
				MessageID: message.MsgID(),
				Timestamp: timestamp,
			}
			pageEvent.Meta().SetMeta(message.Meta())
			return pageEvent
		} else {
			pageEvent := b.Build()
			b.pageEvent = &PageEvent{
				URL:       msg.URL,
				Referrer:  msg.Referrer,
				Loaded:    true,
				MessageID: message.MsgID(),
				Timestamp: timestamp,
			}
			b.pageEvent.Meta().SetMeta(message.Meta())
			return pageEvent
		}
	case MsgPageLoadTiming:
		if b.pageEvent == nil {
			break
		}
		msg, ok := message.Decode().(*PageLoadTiming)
		if !ok {
			return nil
		}
		if msg.RequestStart <= maxLoadTiming {
			b.pageEvent.RequestStart = msg.RequestStart
		}
		if msg.ResponseStart <= maxLoadTiming {
			b.pageEvent.ResponseStart = msg.ResponseStart
		}
		if msg.ResponseEnd <= maxLoadTiming {
			b.pageEvent.ResponseEnd = msg.ResponseEnd
		}
		if msg.DomContentLoadedEventStart <= maxLoadTiming {
			b.pageEvent.DomContentLoadedEventStart = msg.DomContentLoadedEventStart
		}
		if msg.DomContentLoadedEventEnd <= maxLoadTiming {
			b.pageEvent.DomContentLoadedEventEnd = msg.DomContentLoadedEventEnd
		}
		if msg.LoadEventStart <= maxLoadTiming {
			b.pageEvent.LoadEventStart = msg.LoadEventStart
		}
		if msg.LoadEventEnd <= maxLoadTiming {
			b.pageEvent.LoadEventEnd = msg.LoadEventEnd
		}
		if msg.FirstPaint <= maxLoadTiming {
			b.pageEvent.FirstPaint = msg.FirstPaint
		}
		if msg.FirstContentfulPaint <= maxLoadTiming {
			b.pageEvent.FirstContentfulPaint = msg.FirstContentfulPaint
		}
		return nil
	case MsgPageRenderTiming:
		if b.pageEvent == nil {
			break
		}
		msg, ok := message.Decode().(*PageRenderTiming)
		if !ok {
			return nil
		}
		b.pageEvent.SpeedIndex = msg.SpeedIndex
		b.pageEvent.VisuallyComplete = msg.VisuallyComplete
		b.pageEvent.TimeToInteractive = msg.TimeToInteractive
		return nil
	case MsgWebVitals:
		msg, ok := message.Decode().(*WebVitals)
		if !ok {
			return nil
		}
		if b.webVitals == nil {
			b.webVitals = make(map[string]string)
		}
		b.webVitals[msg.Name] = msg.Value
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
	if b.webVitals != nil {
		if vitals, err := json.Marshal(b.webVitals); err == nil {
			pageEvent.WebVitals = string(vitals)
		} else {
			fmt.Printf("Error marshalling web vitals: %v\n", err)
		}
		b.webVitals = nil
	}
	return pageEvent
}
