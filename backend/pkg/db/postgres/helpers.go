package postgres

import (
	"openreplay/backend/pkg/messages"
)

func getIssueScore(issueEvent *messages.IssueEvent) int {
	switch issueEvent.Type {
	case "crash", "dead_click", "memory", "cpu":
		return 1000
	case "bad_request", "excessive_scrolling", "click_rage", "missing_resource":
		return 500
	case "slow_resource", "slow_page_load":
		return 100
	default:
		return 100
	}
}

func calcDomBuildingTime(pe *messages.PageEvent) uint64 {
	if pe == nil {
		return 0
	}
	if pe.DomContentLoadedEventStart < pe.ResponseEnd {
		return 0
	}
	return pe.DomContentLoadedEventStart - pe.ResponseEnd
}

func calcResponseTime(pe *messages.PageEvent) uint64 {
	if pe.ResponseStart <= pe.ResponseEnd {
		return pe.ResponseEnd - pe.ResponseStart
	}
	return 0
}
