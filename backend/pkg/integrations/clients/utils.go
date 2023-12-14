package clients

import (
	"fmt"
	"regexp"
	"strings"
)

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
