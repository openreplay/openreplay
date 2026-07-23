package custom

import (
	"encoding/json"
	"fmt"
	"log"
	. "openreplay/backend/pkg/messages"
)

const PageEventTimeout = 1 * 60 * 1000

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
	case MsgWebVitals:
		msg, ok := message.Decode().(*WebVitals)
		if !ok {
			return nil
		}
		if b.webVitals == nil {
			b.webVitals = make(map[string]string)
		}
		b.webVitals[msg.Name] = msg.Value
		log.Printf("WebVitals: name: %v, value: %v, sessID: %d", msg.Name, msg.Value, msg.SessionID())
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
