package datasaver

import (
	"encoding/json"
	"log"
	"openreplay/backend/pkg/messages"
)

type FetchEventFTS struct {
	Method    string `json:"method"`
	URL       string `json:"url"`
	Request   string `json:"request"`
	Response  string `json:"response"`
	Status    uint64 `json:"status"`
	Timestamp uint64 `json:"timestamp"`
	Duration  uint64 `json:"duration"`
}

type PageEventFTS struct {
	MessageID                  uint64 `json:"message_id"`
	Timestamp                  uint64 `json:"timestamp"`
	URL                        string `json:"url"`
	Referrer                   string `json:"referrer"`
	Loaded                     bool   `json:"loaded"`
	RequestStart               uint64 `json:"request_start"`
	ResponseStart              uint64 `json:"response_start"`
	ResponseEnd                uint64 `json:"response_end"`
	DomContentLoadedEventStart uint64 `json:"dom_content_loaded_event_start"`
	DomContentLoadedEventEnd   uint64 `json:"dom_content_loaded_event_end"`
	LoadEventStart             uint64 `json:"load_event_start"`
	LoadEventEnd               uint64 `json:"load_event_end"`
	FirstPaint                 uint64 `json:"first_paint"`
	FirstContentfulPaint       uint64 `json:"first_contentful_paint"`
	SpeedIndex                 uint64 `json:"speed_index"`
	VisuallyComplete           uint64 `json:"visually_complete"`
	TimeToInteractive          uint64 `json:"time_to_interactive"`
}

type GraphQLEventFTS struct {
	OperationKind string `json:"operation_kind"`
	OperationName string `json:"operation_name"`
	Variables     string `json:"variables"`
	Response      string `json:"response"`
}

func (s *Saver) sendToFTS(msg messages.Message, sessionID uint64) {
	// Skip, if FTS is disabled
	if s.producer == nil {
		return
	}

	var (
		event []byte
		err   error
	)

	switch m := msg.(type) {
	// Common
	case *messages.Fetch:
		event, err = json.Marshal(FetchEventFTS{
			Method:    m.Method,
			URL:       m.URL,
			Request:   m.Request,
			Response:  m.Response,
			Status:    m.Status,
			Timestamp: m.Timestamp,
			Duration:  m.Duration,
		})
	case *messages.FetchEvent:
		event, err = json.Marshal(FetchEventFTS{
			Method:    m.Method,
			URL:       m.URL,
			Request:   m.Request,
			Response:  m.Response,
			Status:    m.Status,
			Timestamp: m.Timestamp,
			Duration:  m.Duration,
		})
	case *messages.PageEvent:
		event, err = json.Marshal(PageEventFTS{
			MessageID:                  m.MessageID,
			Timestamp:                  m.Timestamp,
			URL:                        m.URL,
			Referrer:                   m.Referrer,
			Loaded:                     m.Loaded,
			RequestStart:               m.RequestStart,
			ResponseStart:              m.ResponseStart,
			ResponseEnd:                m.ResponseEnd,
			DomContentLoadedEventStart: m.DomContentLoadedEventStart,
			DomContentLoadedEventEnd:   m.DomContentLoadedEventEnd,
			LoadEventStart:             m.LoadEventStart,
			LoadEventEnd:               m.LoadEventEnd,
			FirstPaint:                 m.FirstPaint,
			FirstContentfulPaint:       m.FirstContentfulPaint,
			SpeedIndex:                 m.SpeedIndex,
			VisuallyComplete:           m.VisuallyComplete,
			TimeToInteractive:          m.TimeToInteractive,
		})
	case *messages.GraphQL:
		event, err = json.Marshal(GraphQLEventFTS{
			OperationKind: m.OperationKind,
			OperationName: m.OperationName,
			Variables:     m.Variables,
			Response:      m.Response,
		})
	case *messages.GraphQLEvent:
		event, err = json.Marshal(GraphQLEventFTS{
			OperationKind: m.OperationKind,
			OperationName: m.OperationName,
			Variables:     m.Variables,
			Response:      m.Response,
		})
	}
	if err != nil {
		log.Printf("can't marshal json for quickwit: %s", err)
	} else {
		if len(event) > 0 {
			if err := s.producer.Produce("quickwit", sessionID, event); err != nil {
				log.Printf("can't send event to quickwit: %s", err)
			}
		}
	}
}
