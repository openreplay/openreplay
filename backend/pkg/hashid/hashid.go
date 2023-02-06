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

func IOSCrashID(projectID uint32, crash *messages.IOSCrash) string {
	hash := fnv.New128a()
	hash.Write([]byte(crash.Name))
	hash.Write([]byte(crash.Reason))
	hash.Write([]byte(crash.Stacktrace))
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil))
}
