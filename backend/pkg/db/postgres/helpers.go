package postgres

import (
	"math"

	"openreplay/backend/pkg/messages"
)

func GetIssueScore(issueType string) int {
	switch issueType {
	case "crash", "dead_click", "memory", "cpu":
		return 1000
	case "bad_request", "excessive_scrolling", "click_rage", "missing_resource", "tap_rage":
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

// TODO: review message indexing (it is better to have lower values in db for faster search (int4/int2))
func truncSqIdx(messageID uint64) uint32 {
	return uint32(messageID % math.MaxInt32)
}
