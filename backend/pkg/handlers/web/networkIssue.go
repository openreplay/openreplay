package web

import (
	. "openreplay/backend/pkg/messages"
)

/*
	Handler name: NetworkIssue
	Input events: ResourceTiming,
				  NetworkRequest
	Output event: IssueEvent
*/

type NetworkIssueDetector struct{}

func (f *NetworkIssueDetector) Build() Message {
	return nil
}

func (f *NetworkIssueDetector) Handle(message Message, messageID uint64, timestamp uint64) Message {
	switch msg := message.(type) {
	case *NetworkRequest:
		if msg.Status >= 400 {
			return &IssueEvent{
				Type:          "bad_request",
				MessageID:     messageID,
				Timestamp:     msg.Timestamp,
				ContextString: msg.URL,
			}
		}
	}
	return nil
}
