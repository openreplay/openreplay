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

func WebIntegrationEventErrorID(projectID uint32, m *messages.IntegrationEvent) string {
	hash := fnv.New128a()
	hash.Write([]byte(m.Source))
	hash.Write([]byte(m.Name))
	hash.Write([]byte(m.Message))
	hash.Write([]byte(m.Payload))
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil))
}

func WebJSExceptionErrorID(projectID uint32, m *messages.JSException) string {
	hash := fnv.New128a()
	hash.Write([]byte("js_exsception"))
	hash.Write([]byte(m.Name))
	hash.Write([]byte(m.Message))
	hash.Write([]byte(m.Payload))
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil))
}
