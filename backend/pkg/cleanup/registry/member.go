package registry

import (
	"fmt"
	"strconv"
	"strings"
)

const (
	PendingKey            = "cleanup:pending"
	DeadlineGraceMs int64 = 10 * 60 * 1000
)

func Member(sessionID uint64, isMobile bool) string {
	if isMobile {
		return strconv.FormatUint(sessionID, 10) + ":m"
	}
	return strconv.FormatUint(sessionID, 10) + ":w"
}

func ParseMember(member string) (sessionID uint64, isMobile bool, err error) {
	parts := strings.Split(member, ":")
	if len(parts) != 2 || (parts[1] != "w" && parts[1] != "m") {
		return 0, false, fmt.Errorf("malformed cleanup member: %s", member)
	}
	sessionID, err = strconv.ParseUint(parts[0], 10, 64)
	if err != nil {
		return 0, false, fmt.Errorf("malformed cleanup member: %s", member)
	}
	return sessionID, parts[1] == "m", nil
}
