package utime

import "time"

func CurrentTimestamp() int64 {
	return time.Now().UnixNano() / 1e6
}

func ToMilliseconds(t time.Time) int64 {
	return t.UnixNano() / 1e6
}
