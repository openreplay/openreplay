package integration

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var reSessionID = regexp.MustCompile(`(?i)asayer_session_id=([0-9]+)`)

func GetAsayerSessionId(s string) (uint64, error) {
	matches := reSessionID.FindStringSubmatch(s)
	if len(matches) < 2 {
		return 0, fmt.Errorf("'asayer_session_id' not found in '%v' ", s)
	}
	return strconv.ParseUint(matches[1], 10, 64)
}

func GetLinkFromAngularBrackets(s string) string {
	beg := strings.Index(s, "<") + 1
	end := strings.Index(s, ">")
	if end < 0 {
		return ""
	}
	return strings.TrimSpace(s[beg:end])
}

var reToken = regexp.MustCompile(`(?i)openReplaySessionToken=([0-9a-zA-Z\.]+)`)

func GetToken(s string) (string, error) {
	matches := reToken.FindStringSubmatch(s)
	if len(matches) < 2 {
		return "", fmt.Errorf("'openReplaySessionToken' not found in '%v' ", s)
	}
	return matches[1], nil
}
