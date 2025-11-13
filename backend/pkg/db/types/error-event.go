package types

import (
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"strconv"

	"github.com/google/uuid"

	. "openreplay/backend/pkg/messages"
)

type stackFrame struct {
	FileName string `json:"fileName"`
	LineNo   int    `json:"lineNumber"`
	ColNo    int    `json:"columnNumber"`
}

func parseFirstFrame(payload string) (*stackFrame, error) {
	var frames []*stackFrame
	if err := json.Unmarshal([]byte(payload), &frames); err != nil {
		return nil, err
	}
	if len(frames) == 0 {
		return nil, nil
	}
	return frames[0], nil
}

func GenerateID(e *JSException, projectID uint32) (string, error) {
	var idErr error
	hash := fnv.New128a()
	hash.Write([]byte("js_exception"))
	hash.Write([]byte(e.Name))
	hash.Write([]byte(e.Message))
	frame, err := parseFirstFrame(e.Payload)
	if err != nil {
		idErr = fmt.Errorf("can't parse stackframe ((( %v ))): %v", e.Payload, err)
	}
	if frame != nil {
		hash.Write([]byte(frame.FileName))
		hash.Write([]byte(strconv.Itoa(frame.LineNo)))
		hash.Write([]byte(strconv.Itoa(frame.ColNo)))
	}
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil)), idErr
}

func GenerateUUID(e *JSException, sessID uint64) string {
	hash := fnv.New128a()
	hash.Write(Uint64ToBytes(sessID))
	hash.Write(Uint64ToBytes(e.Meta().Index))
	hash.Write(Uint64ToBytes(uint64(e.TypeID())))
	uuidObj, err := uuid.FromBytes(hash.Sum(nil))
	if err != nil {
		fmt.Printf("can't create uuid from bytes: %s", err)
		uuidObj = uuid.New()
	}
	return uuidObj.String()
}

func WrapCustomEvent(m *CustomEvent) *IssueEvent {
	msg := &IssueEvent{
		Type:          "custom",
		Timestamp:     m.Time(),
		MessageID:     m.MsgID(),
		ContextString: m.Name,
		Payload:       m.Payload,
	}
	msg.Meta().SetMeta(m.Meta())
	return msg
}

func Uint64ToBytes(num uint64) []byte {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, num)
	return buf
}
