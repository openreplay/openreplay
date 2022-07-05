package util

import "strings"

func SafeString(s string) string {
	safe := strings.ReplaceAll(s, "\n", "")
	return strings.ReplaceAll(safe, "\r", "")
}
