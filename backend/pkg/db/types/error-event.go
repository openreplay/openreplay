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

const SOURCE_JS = "js_exception"

type ErrorEvent struct {
	MessageID  uint64
	Timestamp  uint64
	Source     string
	Name       string
	Message    string
	Payload    string
	Tags       map[string]*string
	OriginType int
	Url        string
	PageTitle  string
}

func WrapJSException(m *JSException) *ErrorEvent {
	return &ErrorEvent{
		MessageID:  m.Meta().Index,
		Timestamp:  m.Meta().Timestamp,
		Source:     SOURCE_JS,
		Name:       m.Name,
		Message:    m.Message,
		Payload:    m.Payload,
		OriginType: m.TypeID(),
		Url:        m.Url,
		PageTitle:  m.PageTitle,
	}
}

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

func (e *ErrorEvent) ID(projectID uint32) (string, error) {
	var idErr error
	hash := fnv.New128a()
	hash.Write([]byte(e.Source))
	hash.Write([]byte(e.Name))
	hash.Write([]byte(e.Message))
	if e.Source == SOURCE_JS {
		frame, err := parseFirstFrame(e.Payload)
		if err != nil {
			idErr = fmt.Errorf("can't parse stackframe ((( %v ))): %v", e.Payload, err)
		}
		if frame != nil {
			hash.Write([]byte(frame.FileName))
			hash.Write([]byte(strconv.Itoa(frame.LineNo)))
			hash.Write([]byte(strconv.Itoa(frame.ColNo)))
		}
	}
	return strconv.FormatUint(uint64(projectID), 16) + hex.EncodeToString(hash.Sum(nil)), idErr
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

func (e *ErrorEvent) GetUUID(sessID uint64) string {
	hash := fnv.New128a()
	hash.Write(Uint64ToBytes(sessID))
	hash.Write(Uint64ToBytes(e.MessageID))
	hash.Write(Uint64ToBytes(uint64(e.OriginType)))
	uuidObj, err := uuid.FromBytes(hash.Sum(nil))
	if err != nil {
		fmt.Printf("can't create uuid from bytes: %s", err)
		uuidObj = uuid.New()
	}
	return uuidObj.String()
}

func Uint64ToBytes(num uint64) []byte {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, num)
	return buf
}
