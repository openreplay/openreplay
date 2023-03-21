package messages

func transformDeprecated(msg Message) Message {
	switch m := msg.(type) {
	case *JSExceptionDeprecated:
		return &JSException{
			Name:     m.Name,
			Message:  m.Message,
			Payload:  m.Payload,
			Metadata: "{}",
		}
	case *Fetch:
		return &NetworkRequest{
			Type:      "fetch",
			Method:    m.Method,
			URL:       m.URL,
			Request:   m.Request,
			Response:  m.Response,
			Status:    m.Status,
			Timestamp: m.Timestamp,
			Duration:  m.Duration,
		}
	case *IssueEventDeprecated:
		return &IssueEvent{
			MessageID:     m.MessageID,
			Timestamp:     m.Timestamp,
			Type:          m.Type,
			ContextString: m.ContextString,
			Context:       m.Context,
			Payload:       m.Payload,
			URL:           "",
		}
	case *ResourceTimingDeprecated:
		return &ResourceTiming{
			Timestamp:       m.Timestamp,
			Duration:        m.Duration,
			TTFB:            m.TTFB,
			HeaderSize:      m.HeaderSize,
			EncodedBodySize: m.EncodedBodySize,
			DecodedBodySize: m.DecodedBodySize,
			URL:             m.URL,
			Initiator:       m.Initiator,
			TransferredSize: 0,
			Cached:          false,
		}
	}
	return msg
}
