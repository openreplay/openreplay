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
	switch msg := message.(type) {
	case *messages.UnbindNodes:
		if msg.TotalRemovedPercent < CrashThreshold {
			// Not enough nodes removed
			return nil
		}
		h.dropTimestamp = timestamp
		h.dropMessageID = msg.MsgID()
	case *messages.JSException:
		h.updateLastIssueTimestamp(msg.Timestamp)
	case *messages.NetworkRequest:
		if msg.Status >= 400 {
			h.updateLastIssueTimestamp(msg.Timestamp)
		}
	}
	return h.build()
}

func (h *AppCrashDetector) Build() messages.Message {
	return h.build()
}
