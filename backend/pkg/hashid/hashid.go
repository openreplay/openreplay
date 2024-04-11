package hashid

import (
	"encoding/hex"
	"hash/fnv"
	"strconv"

	"openreplay/backend/pkg/messages"
)

func IssueID(projectID uint32, e *messages.IssueEvent) string {
	hash := fnv.New128a()
	hash.Write([]byte(e.Type))
	hash.Write([]byte(e.ContextString))
	//hash.Write([]byte(e.Context)) // More detailed that contextString (what about Data Redundancy?)
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil))
}

func MobileIssueID(projectID uint32, e *messages.MobileIssueEvent) string {
	hash := fnv.New128a()
	hash.Write([]byte(e.Type))
	hash.Write([]byte(e.ContextString))
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil))
}

func MobileCrashID(projectID uint32, crash *messages.MobileCrash) string {
	hash := fnv.New128a()
	hash.Write([]byte(crash.Name))
	hash.Write([]byte(crash.Reason))
	hash.Write([]byte(crash.Stacktrace))
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil))
}

func MouseThrashingID(projectID uint32, sessID, ts uint64) string {
	hash := fnv.New128a()
	hash.Write([]byte("mouse_trashing"))
	hash.Write([]byte(strconv.FormatUint(sessID, 10)))
	hash.Write([]byte(strconv.FormatUint(ts, 10)))
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil))
}
