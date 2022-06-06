package web

import (
	. "openreplay/backend/pkg/messages"
)

/*
	Handler name: NetworkIssue
	Input events: ResourceTiming,
				  Fetch
	Output event: IssueEvent
*/

type NetworkIssueDetector struct{}

func (f *NetworkIssueDetector) Build() Message {
	return nil
}

func (f *NetworkIssueDetector) Handle(message Message, messageID uint64, timestamp uint64) Message {
	switch msg := message.(type) {
	case *ResourceTiming:
		success := msg.Duration != 0 // The only available way here
		if !success {
			issueType := "missing_resource"
			if msg.Initiator == "fetch" || msg.Initiator == "xmlhttprequest" {
				issueType = "bad_request"
			}
			return &IssueEvent{
				Type:          issueType,
				MessageID:     messageID,
				Timestamp:     msg.Timestamp,
				ContextString: msg.URL,
			}
		}
	case *Fetch:
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
