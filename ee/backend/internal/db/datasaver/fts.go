package datasaver

import (
	"encoding/json"
	"log"
	"openreplay/backend/pkg/messages"
)

type NetworkRequestFTS struct {
	SessionID uint64 `json:"session_id"`
	ProjectID uint32 `json:"project_id"`
	Method    string `json:"method"`
	URL       string `json:"url"`
	Request   string `json:"request"`
	Response  string `json:"response"`
	Status    uint64 `json:"status"`
	Timestamp uint64 `json:"timestamp"`
	Duration  uint64 `json:"duration"`
}

func WrapNetworkRequest(m *messages.NetworkRequest, projID uint32) *NetworkRequestFTS {
	return &NetworkRequestFTS{
		SessionID: m.SessionID(),
		ProjectID: projID,
		Method:    m.Method,
		URL:       m.URL,
		Request:   m.Request,
		Response:  m.Response,
		Status:    m.Status,
		Timestamp: m.Timestamp,
		Duration:  m.Duration,
	}
}

type PageEventFTS struct {
	SessionID                  uint64 `json:"session_id"`
	ProjectID                  uint32 `json:"project_id"`
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

func WrapPageEvent(m *messages.PageEvent, projID uint32) *PageEventFTS {
	return &PageEventFTS{
		SessionID:                  m.SessionID(),
		ProjectID:                  projID,
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
	}
}

type GraphQLFTS struct {
	SessionID     uint64 `json:"session_id"`
	ProjectID     uint32 `json:"project_id"`
	OperationKind string `json:"operation_kind"`
	OperationName string `json:"operation_name"`
	Variables     string `json:"variables"`
	Response      string `json:"response"`
}

func WrapGraphQL(m *messages.GraphQL, projID uint32) *GraphQLFTS {
	return &GraphQLFTS{
		SessionID:     m.SessionID(),
		ProjectID:     projID,
		OperationKind: m.OperationKind,
		OperationName: m.OperationName,
		Variables:     m.Variables,
		Response:      m.Response,
	}
}

func (s *saverImpl) sendToFTS(msg messages.Message, projID uint32) {
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
	case *messages.NetworkRequest:
		event, err = json.Marshal(WrapNetworkRequest(m, projID))
	case *messages.PageEvent:
		event, err = json.Marshal(WrapPageEvent(m, projID))
	case *messages.GraphQL:
		event, err = json.Marshal(WrapGraphQL(m, projID))
	}
	if err != nil {
		log.Printf("can't marshal json for quickwit: %s", err)
	} else {
		if len(event) > 0 {
			if err := s.producer.Produce(s.cfg.QuickwitTopic, msg.SessionID(), event); err != nil {
				log.Printf("can't send event to quickwit: %s", err)
			}
		}
	}
}
