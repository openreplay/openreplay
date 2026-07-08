package web

import (
	"openreplay/backend/pkg/messages"
)

const CrashWindow = 2 * 1000
const CrashThreshold = 70

type AppCrashDetector struct {
	dropTimestamp      uint64
	dropMessageID      uint64
	lastIssueTimestamp uint64
}

func NewAppCrashDetector() *AppCrashDetector {
	return &AppCrashDetector{}
}

func (h *AppCrashDetector) MessageTypes() []int {
	return []int{
		messages.MsgUnbindNodes,
		messages.MsgJSException,
		messages.MsgNetworkRequest,
	}
}

func (h *AppCrashDetector) reset() {
	h.dropTimestamp = 0
	h.lastIssueTimestamp = 0
}

func (h *AppCrashDetector) updateLastIssueTimestamp(msgTimestamp uint64) {
	if msgTimestamp > h.lastIssueTimestamp {
		h.lastIssueTimestamp = msgTimestamp
	}
}

func (h *AppCrashDetector) build() messages.Message {
	if h.dropTimestamp == 0 || h.lastIssueTimestamp == 0 {
		// Nothing to build
		return nil
	}

	// Calculate timestamp difference
	var diff uint64
	if h.lastIssueTimestamp > h.dropTimestamp {
		diff = h.lastIssueTimestamp - h.dropTimestamp
	} else {
		diff = h.dropTimestamp - h.lastIssueTimestamp
	}

	// Check possible app crash
	if diff < CrashWindow {
		msg := &messages.IssueEvent{
			MessageID: h.dropMessageID,
			Timestamp: h.dropTimestamp,
			Type:      "app_crash",
		}
		h.reset()
		return msg
	}
	return nil
}

func (h *AppCrashDetector) Handle(message messages.Message, timestamp uint64) messages.Message {
	switch message.TypeID() {
	case messages.MsgUnbindNodes:
		msg, ok := message.Decode().(*messages.UnbindNodes)
		if !ok {
			return nil
		}
		if msg.TotalRemovedPercent < CrashThreshold {
			return nil
		}
		h.dropTimestamp = timestamp
		h.dropMessageID = msg.MsgID()
	case messages.MsgJSException:
		msg, ok := message.Decode().(*messages.JSException)
		if !ok {
			return nil
		}
		h.updateLastIssueTimestamp(msg.Timestamp)
	case messages.MsgNetworkRequest:
		msg, ok := message.Decode().(*messages.NetworkRequest)
		if !ok {
			return nil
		}
		if msg.Status >= 400 {
			h.updateLastIssueTimestamp(msg.Timestamp)
		}
	}
	return h.build()
}

func (h *AppCrashDetector) Build() messages.Message {
	return h.build()
}
