// Auto-generated, do not edit
package messages

import "encoding/binary"

const (

    MsgBatchMeta = 80

    MsgBatchMetadata = 81

    MsgPartitionedMessage = 82

    MsgTimestamp = 0

    MsgSessionStart = 1

    MsgSessionEnd = 3

    MsgSetPageLocation = 4

    MsgSetViewportSize = 5

    MsgSetViewportScroll = 6

    MsgCreateDocument = 7

    MsgCreateElementNode = 8

    MsgCreateTextNode = 9

    MsgMoveNode = 10

    MsgRemoveNode = 11

    MsgSetNodeAttribute = 12

    MsgRemoveNodeAttribute = 13

    MsgSetNodeData = 14

    MsgSetCSSData = 15

    MsgSetNodeScroll = 16

    MsgSetInputTarget = 17

    MsgSetInputValue = 18

    MsgSetInputChecked = 19

    MsgMouseMove = 20

    MsgConsoleLog = 22

    MsgPageLoadTiming = 23

    MsgPageRenderTiming = 24

  	MsgJSExceptionDeprecated = 25

    MsgIntegrationEvent = 26

    MsgRawCustomEvent = 27

    MsgUserID = 28

    MsgUserAnonymousID = 29

    MsgMetadata = 30

    MsgPageEvent = 31

    MsgInputEvent = 32

    MsgClickEvent = 33

    MsgErrorEvent = 34

    MsgResourceEvent = 35

    MsgCustomEvent = 36

    MsgCSSInsertRule = 37

    MsgCSSDeleteRule = 38

    MsgFetch = 39

    MsgProfiler = 40

    MsgOTable = 41

    MsgStateAction = 42

    MsgStateActionEvent = 43

    MsgRedux = 44

    MsgVuex = 45

    MsgMobX = 46

    MsgNgRx = 47

    MsgGraphQL = 48

    MsgPerformanceTrack = 49

    MsgGraphQLEvent = 50

    MsgFetchEvent = 51

    MsgDOMDrop = 52

    MsgResourceTiming = 53

    MsgConnectionInformation = 54

    MsgSetPageVisibility = 55

    MsgPerformanceTrackAggr = 56

    MsgLongTask = 59

    MsgSetNodeAttributeURLBased = 60

    MsgSetCSSDataURLBased = 61

    MsgIssueEvent = 62

    MsgTechnicalInfo = 63

    MsgCustomIssue = 64

    MsgAssetCache = 66

    MsgCSSInsertRuleURLBased = 67

    MsgMouseClick = 69

    MsgCreateIFrameDocument = 70

    MsgAdoptedSSReplaceURLBased = 71

    MsgAdoptedSSReplace = 72

    MsgAdoptedSSInsertRuleURLBased = 73

    MsgAdoptedSSInsertRule = 74

    MsgAdoptedSSDeleteRule = 75

    MsgAdoptedSSAddOwner = 76

    MsgAdoptedSSRemoveOwner = 77

    MsgZustand = 79

  	MsgJSException = 78

	  MsgSessionSearch = 127

	  MsgExceptionWithMeta = 78

    MsgIOSBatchMeta = 107

    MsgIOSSessionStart = 90

    MsgIOSSessionEnd = 91

    MsgIOSMetadata = 92

    MsgIOSCustomEvent = 93

    MsgIOSUserID = 94

    MsgIOSUserAnonymousID = 95

    MsgIOSScreenChanges = 96

    MsgIOSCrash = 97

    MsgIOSScreenEnter = 98

    MsgIOSScreenLeave = 99

    MsgIOSClickEvent = 100

    MsgIOSInputEvent = 101

    MsgIOSPerformanceEvent = 102

    MsgIOSLog = 103

    MsgIOSInternalError = 104

    MsgIOSNetworkCall = 105

    MsgIOSPerformanceAggregated = 110

    MsgIOSIssueEvent = 111

)


type BatchMeta struct {
	message
	PageNo uint64
	FirstIndex uint64
	Timestamp int64
}

func (msg *BatchMeta) Encode() []byte {
	buf := make([]byte, 31)
	buf[0] = 80
	p := 1
	p = WriteUint(msg.PageNo, buf, p)
	p = WriteUint(msg.FirstIndex, buf, p)
	p = WriteInt(msg.Timestamp, buf, p)
	return buf[:p]
}

func (msg *BatchMeta) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *BatchMeta) Decode() Message {
	return msg
}

func (msg *BatchMeta) TypeID() int {
	return 80
}

type BatchMetadata struct {
	message
	Version uint64
	PageNo uint64
	FirstIndex uint64
	Timestamp int64
	Location string
}

func (msg *BatchMetadata) Encode() []byte {
	buf := make([]byte, 51+len(msg.Location))
	buf[0] = 81
	p := 1
	p = WriteUint(msg.Version, buf, p)
	p = WriteUint(msg.PageNo, buf, p)
	p = WriteUint(msg.FirstIndex, buf, p)
	p = WriteInt(msg.Timestamp, buf, p)
	p = WriteString(msg.Location, buf, p)
	return buf[:p]
}

func (msg *BatchMetadata) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *BatchMetadata) Decode() Message {
	return msg
}

func (msg *BatchMetadata) TypeID() int {
	return 81
}

type PartitionedMessage struct {
	message
	PartNo uint64
	PartTotal uint64
}

func (msg *PartitionedMessage) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 82
	p := 1
	p = WriteUint(msg.PartNo, buf, p)
	p = WriteUint(msg.PartTotal, buf, p)
	return buf[:p]
}

func (msg *PartitionedMessage) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *PartitionedMessage) Decode() Message {
	return msg
}

func (msg *PartitionedMessage) TypeID() int {
	return 82
}

type Timestamp struct {
	message
	Timestamp uint64
}

func (msg *Timestamp) Encode() []byte {
	buf := make([]byte, 11)
	buf[0] = 0
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	return buf[:p]
}

func (msg *Timestamp) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *Timestamp) Decode() Message {
	return msg
}

func (msg *Timestamp) TypeID() int {
	return 0
}

type SessionStart struct {
	message
	Timestamp uint64
	ProjectID uint64
	TrackerVersion string
	RevID string
	UserUUID string
	UserAgent string
	UserOS string
	UserOSVersion string
	UserBrowser string
	UserBrowserVersion string
	UserDevice string
	UserDeviceType string
	UserDeviceMemorySize uint64
	UserDeviceHeapSize uint64
	UserCountry string
	UserID string
}

func (msg *SessionStart) Encode() []byte {
	buf := make([]byte, 161+len(msg.TrackerVersion)+len(msg.RevID)+len(msg.UserUUID)+len(msg.UserAgent)+len(msg.UserOS)+len(msg.UserOSVersion)+len(msg.UserBrowser)+len(msg.UserBrowserVersion)+len(msg.UserDevice)+len(msg.UserDeviceType)+len(msg.UserCountry)+len(msg.UserID))
	buf[0] = 1
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.ProjectID, buf, p)
	p = WriteString(msg.TrackerVersion, buf, p)
	p = WriteString(msg.RevID, buf, p)
	p = WriteString(msg.UserUUID, buf, p)
	p = WriteString(msg.UserAgent, buf, p)
	p = WriteString(msg.UserOS, buf, p)
	p = WriteString(msg.UserOSVersion, buf, p)
	p = WriteString(msg.UserBrowser, buf, p)
	p = WriteString(msg.UserBrowserVersion, buf, p)
	p = WriteString(msg.UserDevice, buf, p)
	p = WriteString(msg.UserDeviceType, buf, p)
	p = WriteUint(msg.UserDeviceMemorySize, buf, p)
	p = WriteUint(msg.UserDeviceHeapSize, buf, p)
	p = WriteString(msg.UserCountry, buf, p)
	p = WriteString(msg.UserID, buf, p)
	return buf[:p]
}

func (msg *SessionStart) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SessionStart) Decode() Message {
	return msg
}

func (msg *SessionStart) TypeID() int {
	return 1
}

type SessionEnd struct {
	message
	Timestamp uint64
	EncryptionKey string
}

func (msg *SessionEnd) Encode() []byte {
	buf := make([]byte, 21+len(msg.EncryptionKey))
	buf[0] = 3
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.EncryptionKey, buf, p)
	return buf[:p]
}

func (msg *SessionEnd) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SessionEnd) Decode() Message {
	return msg
}

func (msg *SessionEnd) TypeID() int {
	return 3
}

type SetPageLocation struct {
	message
	URL string
	Referrer string
	NavigationStart uint64
}

func (msg *SetPageLocation) Encode() []byte {
	buf := make([]byte, 31+len(msg.URL)+len(msg.Referrer))
	buf[0] = 4
	p := 1
	p = WriteString(msg.URL, buf, p)
	p = WriteString(msg.Referrer, buf, p)
	p = WriteUint(msg.NavigationStart, buf, p)
	return buf[:p]
}

func (msg *SetPageLocation) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetPageLocation) Decode() Message {
	return msg
}

func (msg *SetPageLocation) TypeID() int {
	return 4
}

type SetViewportSize struct {
	message
	Width uint64
	Height uint64
}

func (msg *SetViewportSize) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 5
	p := 1
	p = WriteUint(msg.Width, buf, p)
	p = WriteUint(msg.Height, buf, p)
	return buf[:p]
}

func (msg *SetViewportSize) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetViewportSize) Decode() Message {
	return msg
}

func (msg *SetViewportSize) TypeID() int {
	return 5
}

type SetViewportScroll struct {
	message
	X int64
	Y int64
}

func (msg *SetViewportScroll) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 6
	p := 1
	p = WriteInt(msg.X, buf, p)
	p = WriteInt(msg.Y, buf, p)
	return buf[:p]
}

func (msg *SetViewportScroll) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetViewportScroll) Decode() Message {
	return msg
}

func (msg *SetViewportScroll) TypeID() int {
	return 6
}

type CreateDocument struct {
	message

}

func (msg *CreateDocument) Encode() []byte {
	buf := make([]byte, 1)
	buf[0] = 7
	p := 1

	return buf[:p]
}

func (msg *CreateDocument) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CreateDocument) Decode() Message {
	return msg
}

func (msg *CreateDocument) TypeID() int {
	return 7
}

type CreateElementNode struct {
	message
	ID uint64
	ParentID uint64
	index uint64
	Tag string
	SVG bool
}

func (msg *CreateElementNode) Encode() []byte {
	buf := make([]byte, 51+len(msg.Tag))
	buf[0] = 8
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteUint(msg.ParentID, buf, p)
	p = WriteUint(msg.index, buf, p)
	p = WriteString(msg.Tag, buf, p)
	p = WriteBoolean(msg.SVG, buf, p)
	return buf[:p]
}

func (msg *CreateElementNode) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CreateElementNode) Decode() Message {
	return msg
}

func (msg *CreateElementNode) TypeID() int {
	return 8
}

type CreateTextNode struct {
	message
	ID uint64
	ParentID uint64
	Index uint64
}

func (msg *CreateTextNode) Encode() []byte {
	buf := make([]byte, 31)
	buf[0] = 9
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteUint(msg.ParentID, buf, p)
	p = WriteUint(msg.Index, buf, p)
	return buf[:p]
}

func (msg *CreateTextNode) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CreateTextNode) Decode() Message {
	return msg
}

func (msg *CreateTextNode) TypeID() int {
	return 9
}

type MoveNode struct {
	message
	ID uint64
	ParentID uint64
	Index uint64
}

func (msg *MoveNode) Encode() []byte {
	buf := make([]byte, 31)
	buf[0] = 10
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteUint(msg.ParentID, buf, p)
	p = WriteUint(msg.Index, buf, p)
	return buf[:p]
}

func (msg *MoveNode) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *MoveNode) Decode() Message {
	return msg
}

func (msg *MoveNode) TypeID() int {
	return 10
}

type RemoveNode struct {
	message
	ID uint64
}

func (msg *RemoveNode) Encode() []byte {
	buf := make([]byte, 11)
	buf[0] = 11
	p := 1
	p = WriteUint(msg.ID, buf, p)
	return buf[:p]
}

func (msg *RemoveNode) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *RemoveNode) Decode() Message {
	return msg
}

func (msg *RemoveNode) TypeID() int {
	return 11
}

type SetNodeAttribute struct {
	message
	ID uint64
	Name string
	Value string
}

func (msg *SetNodeAttribute) Encode() []byte {
	buf := make([]byte, 31+len(msg.Name)+len(msg.Value))
	buf[0] = 12
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *SetNodeAttribute) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetNodeAttribute) Decode() Message {
	return msg
}

func (msg *SetNodeAttribute) TypeID() int {
	return 12
}

type RemoveNodeAttribute struct {
	message
	ID uint64
	Name string
}

func (msg *RemoveNodeAttribute) Encode() []byte {
	buf := make([]byte, 21+len(msg.Name))
	buf[0] = 13
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Name, buf, p)
	return buf[:p]
}

func (msg *RemoveNodeAttribute) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *RemoveNodeAttribute) Decode() Message {
	return msg
}

func (msg *RemoveNodeAttribute) TypeID() int {
	return 13
}

type SetNodeData struct {
	message
	ID uint64
	Data string
}

func (msg *SetNodeData) Encode() []byte {
	buf := make([]byte, 21+len(msg.Data))
	buf[0] = 14
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Data, buf, p)
	return buf[:p]
}

func (msg *SetNodeData) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetNodeData) Decode() Message {
	return msg
}

func (msg *SetNodeData) TypeID() int {
	return 14
}

type SetCSSData struct {
	message
	ID uint64
	Data string
}

func (msg *SetCSSData) Encode() []byte {
	buf := make([]byte, 21+len(msg.Data))
	buf[0] = 15
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Data, buf, p)
	return buf[:p]
}

func (msg *SetCSSData) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetCSSData) Decode() Message {
	return msg
}

func (msg *SetCSSData) TypeID() int {
	return 15
}

type SetNodeScroll struct {
	message
	ID uint64
	X int64
	Y int64
}

func (msg *SetNodeScroll) Encode() []byte {
	buf := make([]byte, 31)
	buf[0] = 16
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteInt(msg.X, buf, p)
	p = WriteInt(msg.Y, buf, p)
	return buf[:p]
}

func (msg *SetNodeScroll) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetNodeScroll) Decode() Message {
	return msg
}

func (msg *SetNodeScroll) TypeID() int {
	return 16
}

type SetInputTarget struct {
	message
	ID uint64
	Label string
}

func (msg *SetInputTarget) Encode() []byte {
	buf := make([]byte, 21+len(msg.Label))
	buf[0] = 17
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Label, buf, p)
	return buf[:p]
}

func (msg *SetInputTarget) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetInputTarget) Decode() Message {
	return msg
}

func (msg *SetInputTarget) TypeID() int {
	return 17
}

type SetInputValue struct {
	message
	ID uint64
	Value string
	Mask int64
}

func (msg *SetInputValue) Encode() []byte {
	buf := make([]byte, 31+len(msg.Value))
	buf[0] = 18
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Value, buf, p)
	p = WriteInt(msg.Mask, buf, p)
	return buf[:p]
}

func (msg *SetInputValue) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetInputValue) Decode() Message {
	return msg
}

func (msg *SetInputValue) TypeID() int {
	return 18
}

type SetInputChecked struct {
	message
	ID uint64
	Checked bool
}

func (msg *SetInputChecked) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 19
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteBoolean(msg.Checked, buf, p)
	return buf[:p]
}

func (msg *SetInputChecked) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetInputChecked) Decode() Message {
	return msg
}

func (msg *SetInputChecked) TypeID() int {
	return 19
}

type MouseMove struct {
	message
	X uint64
	Y uint64
}

func (msg *MouseMove) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 20
	p := 1
	p = WriteUint(msg.X, buf, p)
	p = WriteUint(msg.Y, buf, p)
	return buf[:p]
}

func (msg *MouseMove) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *MouseMove) Decode() Message {
	return msg
}

func (msg *MouseMove) TypeID() int {
	return 20
}

type ConsoleLog struct {
	message
	Level string
	Value string
}

func (msg *ConsoleLog) Encode() []byte {
	buf := make([]byte, 21+len(msg.Level)+len(msg.Value))
	buf[0] = 22
	p := 1
	p = WriteString(msg.Level, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *ConsoleLog) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *ConsoleLog) Decode() Message {
	return msg
}

func (msg *ConsoleLog) TypeID() int {
	return 22
}

type PageLoadTiming struct {
	message
	RequestStart uint64
	ResponseStart uint64
	ResponseEnd uint64
	DomContentLoadedEventStart uint64
	DomContentLoadedEventEnd uint64
	LoadEventStart uint64
	LoadEventEnd uint64
	FirstPaint uint64
	FirstContentfulPaint uint64
}

func (msg *PageLoadTiming) Encode() []byte {
	buf := make([]byte, 91)
	buf[0] = 23
	p := 1
	p = WriteUint(msg.RequestStart, buf, p)
	p = WriteUint(msg.ResponseStart, buf, p)
	p = WriteUint(msg.ResponseEnd, buf, p)
	p = WriteUint(msg.DomContentLoadedEventStart, buf, p)
	p = WriteUint(msg.DomContentLoadedEventEnd, buf, p)
	p = WriteUint(msg.LoadEventStart, buf, p)
	p = WriteUint(msg.LoadEventEnd, buf, p)
	p = WriteUint(msg.FirstPaint, buf, p)
	p = WriteUint(msg.FirstContentfulPaint, buf, p)
	return buf[:p]
}

func (msg *PageLoadTiming) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *PageLoadTiming) Decode() Message {
	return msg
}

func (msg *PageLoadTiming) TypeID() int {
	return 23
}

type PageRenderTiming struct {
	message
	SpeedIndex uint64
	VisuallyComplete uint64
	TimeToInteractive uint64
}

func (msg *PageRenderTiming) Encode() []byte {
	buf := make([]byte, 31)
	buf[0] = 24
	p := 1
	p = WriteUint(msg.SpeedIndex, buf, p)
	p = WriteUint(msg.VisuallyComplete, buf, p)
	p = WriteUint(msg.TimeToInteractive, buf, p)
	return buf[:p]
}

func (msg *PageRenderTiming) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *PageRenderTiming) Decode() Message {
	return msg
}

func (msg *PageRenderTiming) TypeID() int {
	return 24
}

type JSExceptionDeprecated struct {
	message
	Name string
	Message string
	Payload string
}

func (msg *JSExceptionDeprecated) Encode() []byte {
	buf := make([]byte, 31+len(msg.Name)+len(msg.Message)+len(msg.Payload))
	buf[0] = 25
	p := 1
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Message, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *JSExceptionDeprecated) EncodeWithIndex() []byte {
	encoded := msg.Encode()
	if IsIOSType(msg.TypeID()) {
		return encoded
	}
	data := make([]byte, len(encoded)+8)
	copy(data[8:], encoded[:])
	binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
	return data
}

func (msg *JSExceptionDeprecated) Decode() Message {
	return msg
}

func (msg *JSExceptionDeprecated) TypeID() int {
	return 25
}

type IntegrationEvent struct {
	message
	Timestamp uint64
	Source string
	Name string
	Message string
	Payload string
}

func (msg *IntegrationEvent) Encode() []byte {
	buf := make([]byte, 51+len(msg.Source)+len(msg.Name)+len(msg.Message)+len(msg.Payload))
	buf[0] = 26
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Source, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Message, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *IntegrationEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IntegrationEvent) Decode() Message {
	return msg
}

func (msg *IntegrationEvent) TypeID() int {
	return 26
}

type RawCustomEvent struct {
	message
	Name string
	Payload string
}

func (msg *RawCustomEvent) Encode() []byte {
	buf := make([]byte, 21+len(msg.Name)+len(msg.Payload))
	buf[0] = 27
	p := 1
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *RawCustomEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *RawCustomEvent) Decode() Message {
	return msg
}

func (msg *RawCustomEvent) TypeID() int {
	return 27
}

type UserID struct {
	message
	ID string
}

func (msg *UserID) Encode() []byte {
	buf := make([]byte, 11+len(msg.ID))
	buf[0] = 28
	p := 1
	p = WriteString(msg.ID, buf, p)
	return buf[:p]
}

func (msg *UserID) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *UserID) Decode() Message {
	return msg
}

func (msg *UserID) TypeID() int {
	return 28
}

type UserAnonymousID struct {
	message
	ID string
}

func (msg *UserAnonymousID) Encode() []byte {
	buf := make([]byte, 11+len(msg.ID))
	buf[0] = 29
	p := 1
	p = WriteString(msg.ID, buf, p)
	return buf[:p]
}

func (msg *UserAnonymousID) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *UserAnonymousID) Decode() Message {
	return msg
}

func (msg *UserAnonymousID) TypeID() int {
	return 29
}

type Metadata struct {
	message
	Key string
	Value string
}

func (msg *Metadata) Encode() []byte {
	buf := make([]byte, 21+len(msg.Key)+len(msg.Value))
	buf[0] = 30
	p := 1
	p = WriteString(msg.Key, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *Metadata) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *Metadata) Decode() Message {
	return msg
}

func (msg *Metadata) TypeID() int {
	return 30
}

type PageEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	URL string
	Referrer string
	Loaded bool
	RequestStart uint64
	ResponseStart uint64
	ResponseEnd uint64
	DomContentLoadedEventStart uint64
	DomContentLoadedEventEnd uint64
	LoadEventStart uint64
	LoadEventEnd uint64
	FirstPaint uint64
	FirstContentfulPaint uint64
	SpeedIndex uint64
	VisuallyComplete uint64
	TimeToInteractive uint64
}

func (msg *PageEvent) Encode() []byte {
	buf := make([]byte, 171+len(msg.URL)+len(msg.Referrer))
	buf[0] = 31
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.URL, buf, p)
	p = WriteString(msg.Referrer, buf, p)
	p = WriteBoolean(msg.Loaded, buf, p)
	p = WriteUint(msg.RequestStart, buf, p)
	p = WriteUint(msg.ResponseStart, buf, p)
	p = WriteUint(msg.ResponseEnd, buf, p)
	p = WriteUint(msg.DomContentLoadedEventStart, buf, p)
	p = WriteUint(msg.DomContentLoadedEventEnd, buf, p)
	p = WriteUint(msg.LoadEventStart, buf, p)
	p = WriteUint(msg.LoadEventEnd, buf, p)
	p = WriteUint(msg.FirstPaint, buf, p)
	p = WriteUint(msg.FirstContentfulPaint, buf, p)
	p = WriteUint(msg.SpeedIndex, buf, p)
	p = WriteUint(msg.VisuallyComplete, buf, p)
	p = WriteUint(msg.TimeToInteractive, buf, p)
	return buf[:p]
}

func (msg *PageEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *PageEvent) Decode() Message {
	return msg
}

func (msg *PageEvent) TypeID() int {
	return 31
}

type InputEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	Value string
	ValueMasked bool
	Label string
}

func (msg *InputEvent) Encode() []byte {
	buf := make([]byte, 51+len(msg.Value)+len(msg.Label))
	buf[0] = 32
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Value, buf, p)
	p = WriteBoolean(msg.ValueMasked, buf, p)
	p = WriteString(msg.Label, buf, p)
	return buf[:p]
}

func (msg *InputEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *InputEvent) Decode() Message {
	return msg
}

func (msg *InputEvent) TypeID() int {
	return 32
}

type ClickEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	HesitationTime uint64
	Label string
	Selector string
}

func (msg *ClickEvent) Encode() []byte {
	buf := make([]byte, 51+len(msg.Label)+len(msg.Selector))
	buf[0] = 33
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.HesitationTime, buf, p)
	p = WriteString(msg.Label, buf, p)
	p = WriteString(msg.Selector, buf, p)
	return buf[:p]
}

func (msg *ClickEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *ClickEvent) Decode() Message {
	return msg
}

func (msg *ClickEvent) TypeID() int {
	return 33
}

type ErrorEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	Source string
	Name string
	Message string
	Payload string
}

func (msg *ErrorEvent) Encode() []byte {
	buf := make([]byte, 61+len(msg.Source)+len(msg.Name)+len(msg.Message)+len(msg.Payload))
	buf[0] = 34
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Source, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Message, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *ErrorEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *ErrorEvent) Decode() Message {
	return msg
}

func (msg *ErrorEvent) TypeID() int {
	return 34
}

type ResourceEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	Duration uint64
	TTFB uint64
	HeaderSize uint64
	EncodedBodySize uint64
	DecodedBodySize uint64
	URL string
	Type string
	Success bool
	Method string
	Status uint64
}

func (msg *ResourceEvent) Encode() []byte {
	buf := make([]byte, 121+len(msg.URL)+len(msg.Type)+len(msg.Method))
	buf[0] = 35
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	p = WriteUint(msg.TTFB, buf, p)
	p = WriteUint(msg.HeaderSize, buf, p)
	p = WriteUint(msg.EncodedBodySize, buf, p)
	p = WriteUint(msg.DecodedBodySize, buf, p)
	p = WriteString(msg.URL, buf, p)
	p = WriteString(msg.Type, buf, p)
	p = WriteBoolean(msg.Success, buf, p)
	p = WriteString(msg.Method, buf, p)
	p = WriteUint(msg.Status, buf, p)
	return buf[:p]
}

func (msg *ResourceEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *ResourceEvent) Decode() Message {
	return msg
}

func (msg *ResourceEvent) TypeID() int {
	return 35
}

type CustomEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	Name string
	Payload string
}

func (msg *CustomEvent) Encode() []byte {
	buf := make([]byte, 41+len(msg.Name)+len(msg.Payload))
	buf[0] = 36
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *CustomEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CustomEvent) Decode() Message {
	return msg
}

func (msg *CustomEvent) TypeID() int {
	return 36
}

type CSSInsertRule struct {
	message
	ID uint64
	Rule string
	Index uint64
}

func (msg *CSSInsertRule) Encode() []byte {
	buf := make([]byte, 31+len(msg.Rule))
	buf[0] = 37
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Rule, buf, p)
	p = WriteUint(msg.Index, buf, p)
	return buf[:p]
}

func (msg *CSSInsertRule) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CSSInsertRule) Decode() Message {
	return msg
}

func (msg *CSSInsertRule) TypeID() int {
	return 37
}

type CSSDeleteRule struct {
	message
	ID uint64
	Index uint64
}

func (msg *CSSDeleteRule) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 38
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteUint(msg.Index, buf, p)
	return buf[:p]
}

func (msg *CSSDeleteRule) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CSSDeleteRule) Decode() Message {
	return msg
}

func (msg *CSSDeleteRule) TypeID() int {
	return 38
}

type Fetch struct {
	message
	Method string
	URL string
	Request string
	Response string
	Status uint64
	Timestamp uint64
	Duration uint64
}

func (msg *Fetch) Encode() []byte {
	buf := make([]byte, 71+len(msg.Method)+len(msg.URL)+len(msg.Request)+len(msg.Response))
	buf[0] = 39
	p := 1
	p = WriteString(msg.Method, buf, p)
	p = WriteString(msg.URL, buf, p)
	p = WriteString(msg.Request, buf, p)
	p = WriteString(msg.Response, buf, p)
	p = WriteUint(msg.Status, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	return buf[:p]
}

func (msg *Fetch) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *Fetch) Decode() Message {
	return msg
}

func (msg *Fetch) TypeID() int {
	return 39
}

type Profiler struct {
	message
	Name string
	Duration uint64
	Args string
	Result string
}

func (msg *Profiler) Encode() []byte {
	buf := make([]byte, 41+len(msg.Name)+len(msg.Args)+len(msg.Result))
	buf[0] = 40
	p := 1
	p = WriteString(msg.Name, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	p = WriteString(msg.Args, buf, p)
	p = WriteString(msg.Result, buf, p)
	return buf[:p]
}

func (msg *Profiler) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *Profiler) Decode() Message {
	return msg
}

func (msg *Profiler) TypeID() int {
	return 40
}

type OTable struct {
	message
	Key string
	Value string
}

func (msg *OTable) Encode() []byte {
	buf := make([]byte, 21+len(msg.Key)+len(msg.Value))
	buf[0] = 41
	p := 1
	p = WriteString(msg.Key, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *OTable) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *OTable) Decode() Message {
	return msg
}

func (msg *OTable) TypeID() int {
	return 41
}

type StateAction struct {
	message
	Type string
}

func (msg *StateAction) Encode() []byte {
	buf := make([]byte, 11+len(msg.Type))
	buf[0] = 42
	p := 1
	p = WriteString(msg.Type, buf, p)
	return buf[:p]
}

func (msg *StateAction) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *StateAction) Decode() Message {
	return msg
}

func (msg *StateAction) TypeID() int {
	return 42
}

type StateActionEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	Type string
}

func (msg *StateActionEvent) Encode() []byte {
	buf := make([]byte, 31+len(msg.Type))
	buf[0] = 43
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Type, buf, p)
	return buf[:p]
}

func (msg *StateActionEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *StateActionEvent) Decode() Message {
	return msg
}

func (msg *StateActionEvent) TypeID() int {
	return 43
}

type Redux struct {
	message
	Action string
	State string
	Duration uint64
}

func (msg *Redux) Encode() []byte {
	buf := make([]byte, 31+len(msg.Action)+len(msg.State))
	buf[0] = 44
	p := 1
	p = WriteString(msg.Action, buf, p)
	p = WriteString(msg.State, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	return buf[:p]
}

func (msg *Redux) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *Redux) Decode() Message {
	return msg
}

func (msg *Redux) TypeID() int {
	return 44
}

type Vuex struct {
	message
	Mutation string
	State string
}

func (msg *Vuex) Encode() []byte {
	buf := make([]byte, 21+len(msg.Mutation)+len(msg.State))
	buf[0] = 45
	p := 1
	p = WriteString(msg.Mutation, buf, p)
	p = WriteString(msg.State, buf, p)
	return buf[:p]
}

func (msg *Vuex) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *Vuex) Decode() Message {
	return msg
}

func (msg *Vuex) TypeID() int {
	return 45
}

type MobX struct {
	message
	Type string
	Payload string
}

func (msg *MobX) Encode() []byte {
	buf := make([]byte, 21+len(msg.Type)+len(msg.Payload))
	buf[0] = 46
	p := 1
	p = WriteString(msg.Type, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *MobX) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *MobX) Decode() Message {
	return msg
}

func (msg *MobX) TypeID() int {
	return 46
}

type NgRx struct {
	message
	Action string
	State string
	Duration uint64
}

func (msg *NgRx) Encode() []byte {
	buf := make([]byte, 31+len(msg.Action)+len(msg.State))
	buf[0] = 47
	p := 1
	p = WriteString(msg.Action, buf, p)
	p = WriteString(msg.State, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	return buf[:p]
}

func (msg *NgRx) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *NgRx) Decode() Message {
	return msg
}

func (msg *NgRx) TypeID() int {
	return 47
}

type GraphQL struct {
	message
	OperationKind string
	OperationName string
	Variables string
	Response string
}

func (msg *GraphQL) Encode() []byte {
	buf := make([]byte, 41+len(msg.OperationKind)+len(msg.OperationName)+len(msg.Variables)+len(msg.Response))
	buf[0] = 48
	p := 1
	p = WriteString(msg.OperationKind, buf, p)
	p = WriteString(msg.OperationName, buf, p)
	p = WriteString(msg.Variables, buf, p)
	p = WriteString(msg.Response, buf, p)
	return buf[:p]
}

func (msg *GraphQL) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *GraphQL) Decode() Message {
	return msg
}

func (msg *GraphQL) TypeID() int {
	return 48
}

type PerformanceTrack struct {
	message
	Frames int64
	Ticks int64
	TotalJSHeapSize uint64
	UsedJSHeapSize uint64
}

func (msg *PerformanceTrack) Encode() []byte {
	buf := make([]byte, 41)
	buf[0] = 49
	p := 1
	p = WriteInt(msg.Frames, buf, p)
	p = WriteInt(msg.Ticks, buf, p)
	p = WriteUint(msg.TotalJSHeapSize, buf, p)
	p = WriteUint(msg.UsedJSHeapSize, buf, p)
	return buf[:p]
}

func (msg *PerformanceTrack) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *PerformanceTrack) Decode() Message {
	return msg
}

func (msg *PerformanceTrack) TypeID() int {
	return 49
}

type GraphQLEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	OperationKind string
	OperationName string
	Variables string
	Response string
}

func (msg *GraphQLEvent) Encode() []byte {
	buf := make([]byte, 61+len(msg.OperationKind)+len(msg.OperationName)+len(msg.Variables)+len(msg.Response))
	buf[0] = 50
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.OperationKind, buf, p)
	p = WriteString(msg.OperationName, buf, p)
	p = WriteString(msg.Variables, buf, p)
	p = WriteString(msg.Response, buf, p)
	return buf[:p]
}

func (msg *GraphQLEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *GraphQLEvent) Decode() Message {
	return msg
}

func (msg *GraphQLEvent) TypeID() int {
	return 50
}

type FetchEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	Method string
	URL string
	Request string
	Response string
	Status uint64
	Duration uint64
}

func (msg *FetchEvent) Encode() []byte {
	buf := make([]byte, 81+len(msg.Method)+len(msg.URL)+len(msg.Request)+len(msg.Response))
	buf[0] = 51
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Method, buf, p)
	p = WriteString(msg.URL, buf, p)
	p = WriteString(msg.Request, buf, p)
	p = WriteString(msg.Response, buf, p)
	p = WriteUint(msg.Status, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	return buf[:p]
}

func (msg *FetchEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *FetchEvent) Decode() Message {
	return msg
}

func (msg *FetchEvent) TypeID() int {
	return 51
}

type DOMDrop struct {
	message
	Timestamp uint64
}

func (msg *DOMDrop) Encode() []byte {
	buf := make([]byte, 11)
	buf[0] = 52
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	return buf[:p]
}

func (msg *DOMDrop) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *DOMDrop) Decode() Message {
	return msg
}

func (msg *DOMDrop) TypeID() int {
	return 52
}

type ResourceTiming struct {
	message
	Timestamp uint64
	Duration uint64
	TTFB uint64
	HeaderSize uint64
	EncodedBodySize uint64
	DecodedBodySize uint64
	URL string
	Initiator string
}

func (msg *ResourceTiming) Encode() []byte {
	buf := make([]byte, 81+len(msg.URL)+len(msg.Initiator))
	buf[0] = 53
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	p = WriteUint(msg.TTFB, buf, p)
	p = WriteUint(msg.HeaderSize, buf, p)
	p = WriteUint(msg.EncodedBodySize, buf, p)
	p = WriteUint(msg.DecodedBodySize, buf, p)
	p = WriteString(msg.URL, buf, p)
	p = WriteString(msg.Initiator, buf, p)
	return buf[:p]
}

func (msg *ResourceTiming) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *ResourceTiming) Decode() Message {
	return msg
}

func (msg *ResourceTiming) TypeID() int {
	return 53
}

type ConnectionInformation struct {
	message
	Downlink uint64
	Type string
}

func (msg *ConnectionInformation) Encode() []byte {
	buf := make([]byte, 21+len(msg.Type))
	buf[0] = 54
	p := 1
	p = WriteUint(msg.Downlink, buf, p)
	p = WriteString(msg.Type, buf, p)
	return buf[:p]
}

func (msg *ConnectionInformation) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *ConnectionInformation) Decode() Message {
	return msg
}

func (msg *ConnectionInformation) TypeID() int {
	return 54
}

type SetPageVisibility struct {
	message
	hidden bool
}

func (msg *SetPageVisibility) Encode() []byte {
	buf := make([]byte, 11)
	buf[0] = 55
	p := 1
	p = WriteBoolean(msg.hidden, buf, p)
	return buf[:p]
}

func (msg *SetPageVisibility) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetPageVisibility) Decode() Message {
	return msg
}

func (msg *SetPageVisibility) TypeID() int {
	return 55
}

type PerformanceTrackAggr struct {
	message
	TimestampStart uint64
	TimestampEnd uint64
	MinFPS uint64
	AvgFPS uint64
	MaxFPS uint64
	MinCPU uint64
	AvgCPU uint64
	MaxCPU uint64
	MinTotalJSHeapSize uint64
	AvgTotalJSHeapSize uint64
	MaxTotalJSHeapSize uint64
	MinUsedJSHeapSize uint64
	AvgUsedJSHeapSize uint64
	MaxUsedJSHeapSize uint64
}

func (msg *PerformanceTrackAggr) Encode() []byte {
	buf := make([]byte, 141)
	buf[0] = 56
	p := 1
	p = WriteUint(msg.TimestampStart, buf, p)
	p = WriteUint(msg.TimestampEnd, buf, p)
	p = WriteUint(msg.MinFPS, buf, p)
	p = WriteUint(msg.AvgFPS, buf, p)
	p = WriteUint(msg.MaxFPS, buf, p)
	p = WriteUint(msg.MinCPU, buf, p)
	p = WriteUint(msg.AvgCPU, buf, p)
	p = WriteUint(msg.MaxCPU, buf, p)
	p = WriteUint(msg.MinTotalJSHeapSize, buf, p)
	p = WriteUint(msg.AvgTotalJSHeapSize, buf, p)
	p = WriteUint(msg.MaxTotalJSHeapSize, buf, p)
	p = WriteUint(msg.MinUsedJSHeapSize, buf, p)
	p = WriteUint(msg.AvgUsedJSHeapSize, buf, p)
	p = WriteUint(msg.MaxUsedJSHeapSize, buf, p)
	return buf[:p]
}

func (msg *PerformanceTrackAggr) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *PerformanceTrackAggr) Decode() Message {
	return msg
}

func (msg *PerformanceTrackAggr) TypeID() int {
	return 56
}

type LongTask struct {
	message
	Timestamp uint64
	Duration uint64
	Context uint64
	ContainerType uint64
	ContainerSrc string
	ContainerId string
	ContainerName string
}

func (msg *LongTask) Encode() []byte {
	buf := make([]byte, 71+len(msg.ContainerSrc)+len(msg.ContainerId)+len(msg.ContainerName))
	buf[0] = 59
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	p = WriteUint(msg.Context, buf, p)
	p = WriteUint(msg.ContainerType, buf, p)
	p = WriteString(msg.ContainerSrc, buf, p)
	p = WriteString(msg.ContainerId, buf, p)
	p = WriteString(msg.ContainerName, buf, p)
	return buf[:p]
}

func (msg *LongTask) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *LongTask) Decode() Message {
	return msg
}

func (msg *LongTask) TypeID() int {
	return 59
}

type SetNodeAttributeURLBased struct {
	message
	ID uint64
	Name string
	Value string
	BaseURL string
}

func (msg *SetNodeAttributeURLBased) Encode() []byte {
	buf := make([]byte, 41+len(msg.Name)+len(msg.Value)+len(msg.BaseURL))
	buf[0] = 60
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Value, buf, p)
	p = WriteString(msg.BaseURL, buf, p)
	return buf[:p]
}

func (msg *SetNodeAttributeURLBased) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetNodeAttributeURLBased) Decode() Message {
	return msg
}

func (msg *SetNodeAttributeURLBased) TypeID() int {
	return 60
}

type SetCSSDataURLBased struct {
	message
	ID uint64
	Data string
	BaseURL string
}

func (msg *SetCSSDataURLBased) Encode() []byte {
	buf := make([]byte, 31+len(msg.Data)+len(msg.BaseURL))
	buf[0] = 61
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Data, buf, p)
	p = WriteString(msg.BaseURL, buf, p)
	return buf[:p]
}

func (msg *SetCSSDataURLBased) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *SetCSSDataURLBased) Decode() Message {
	return msg
}

func (msg *SetCSSDataURLBased) TypeID() int {
	return 61
}

type IssueEvent struct {
	message
	MessageID uint64
	Timestamp uint64
	Type string
	ContextString string
	Context string
	Payload string
}

func (msg *IssueEvent) Encode() []byte {
	buf := make([]byte, 61+len(msg.Type)+len(msg.ContextString)+len(msg.Context)+len(msg.Payload))
	buf[0] = 62
	p := 1
	p = WriteUint(msg.MessageID, buf, p)
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Type, buf, p)
	p = WriteString(msg.ContextString, buf, p)
	p = WriteString(msg.Context, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *IssueEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IssueEvent) Decode() Message {
	return msg
}

func (msg *IssueEvent) TypeID() int {
	return 62
}

type TechnicalInfo struct {
	message
	Type string
	Value string
}

func (msg *TechnicalInfo) Encode() []byte {
	buf := make([]byte, 21+len(msg.Type)+len(msg.Value))
	buf[0] = 63
	p := 1
	p = WriteString(msg.Type, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *TechnicalInfo) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *TechnicalInfo) Decode() Message {
	return msg
}

func (msg *TechnicalInfo) TypeID() int {
	return 63
}

type CustomIssue struct {
	message
	Name string
	Payload string
}

func (msg *CustomIssue) Encode() []byte {
	buf := make([]byte, 21+len(msg.Name)+len(msg.Payload))
	buf[0] = 64
	p := 1
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *CustomIssue) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CustomIssue) Decode() Message {
	return msg
}

func (msg *CustomIssue) TypeID() int {
	return 64
}

type AssetCache struct {
	message
	URL string
}

func (msg *AssetCache) Encode() []byte {
	buf := make([]byte, 11+len(msg.URL))
	buf[0] = 66
	p := 1
	p = WriteString(msg.URL, buf, p)
	return buf[:p]
}

func (msg *AssetCache) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AssetCache) Decode() Message {
	return msg
}

func (msg *AssetCache) TypeID() int {
	return 66
}

type CSSInsertRuleURLBased struct {
	message
	ID uint64
	Rule string
	Index uint64
	BaseURL string
}

func (msg *CSSInsertRuleURLBased) Encode() []byte {
	buf := make([]byte, 41+len(msg.Rule)+len(msg.BaseURL))
	buf[0] = 67
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteString(msg.Rule, buf, p)
	p = WriteUint(msg.Index, buf, p)
	p = WriteString(msg.BaseURL, buf, p)
	return buf[:p]
}

func (msg *CSSInsertRuleURLBased) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CSSInsertRuleURLBased) Decode() Message {
	return msg
}

func (msg *CSSInsertRuleURLBased) TypeID() int {
	return 67
}

type MouseClick struct {
	message
	ID uint64
	HesitationTime uint64
	Label string
	Selector string
}

func (msg *MouseClick) Encode() []byte {
	buf := make([]byte, 41+len(msg.Label)+len(msg.Selector))
	buf[0] = 69
	p := 1
	p = WriteUint(msg.ID, buf, p)
	p = WriteUint(msg.HesitationTime, buf, p)
	p = WriteString(msg.Label, buf, p)
	p = WriteString(msg.Selector, buf, p)
	return buf[:p]
}

func (msg *MouseClick) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *MouseClick) Decode() Message {
	return msg
}

func (msg *MouseClick) TypeID() int {
	return 69
}

type CreateIFrameDocument struct {
	message
	FrameID uint64
	ID uint64
}

func (msg *CreateIFrameDocument) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 70
	p := 1
	p = WriteUint(msg.FrameID, buf, p)
	p = WriteUint(msg.ID, buf, p)
	return buf[:p]
}

func (msg *CreateIFrameDocument) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *CreateIFrameDocument) Decode() Message {
	return msg
}

func (msg *CreateIFrameDocument) TypeID() int {
	return 70
}

type AdoptedSSReplaceURLBased struct {
	message
	SheetID uint64
	Text string
	BaseURL string
}

func (msg *AdoptedSSReplaceURLBased) Encode() []byte {
	buf := make([]byte, 31+len(msg.Text)+len(msg.BaseURL))
	buf[0] = 71
	p := 1
	p = WriteUint(msg.SheetID, buf, p)
	p = WriteString(msg.Text, buf, p)
	p = WriteString(msg.BaseURL, buf, p)
	return buf[:p]
}

func (msg *AdoptedSSReplaceURLBased) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AdoptedSSReplaceURLBased) Decode() Message {
	return msg
}

func (msg *AdoptedSSReplaceURLBased) TypeID() int {
	return 71
}

type AdoptedSSReplace struct {
	message
	SheetID uint64
	Text string
}

func (msg *AdoptedSSReplace) Encode() []byte {
	buf := make([]byte, 21+len(msg.Text))
	buf[0] = 72
	p := 1
	p = WriteUint(msg.SheetID, buf, p)
	p = WriteString(msg.Text, buf, p)
	return buf[:p]
}

func (msg *AdoptedSSReplace) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AdoptedSSReplace) Decode() Message {
	return msg
}

func (msg *AdoptedSSReplace) TypeID() int {
	return 72
}

type AdoptedSSInsertRuleURLBased struct {
	message
	SheetID uint64
	Rule string
	Index uint64
	BaseURL string
}

func (msg *AdoptedSSInsertRuleURLBased) Encode() []byte {
	buf := make([]byte, 41+len(msg.Rule)+len(msg.BaseURL))
	buf[0] = 73
	p := 1
	p = WriteUint(msg.SheetID, buf, p)
	p = WriteString(msg.Rule, buf, p)
	p = WriteUint(msg.Index, buf, p)
	p = WriteString(msg.BaseURL, buf, p)
	return buf[:p]
}

func (msg *AdoptedSSInsertRuleURLBased) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AdoptedSSInsertRuleURLBased) Decode() Message {
	return msg
}

func (msg *AdoptedSSInsertRuleURLBased) TypeID() int {
	return 73
}

type AdoptedSSInsertRule struct {
	message
	SheetID uint64
	Rule string
	Index uint64
}

func (msg *AdoptedSSInsertRule) Encode() []byte {
	buf := make([]byte, 31+len(msg.Rule))
	buf[0] = 74
	p := 1
	p = WriteUint(msg.SheetID, buf, p)
	p = WriteString(msg.Rule, buf, p)
	p = WriteUint(msg.Index, buf, p)
	return buf[:p]
}

func (msg *AdoptedSSInsertRule) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AdoptedSSInsertRule) Decode() Message {
	return msg
}

func (msg *AdoptedSSInsertRule) TypeID() int {
	return 74
}

type AdoptedSSDeleteRule struct {
	message
	SheetID uint64
	Index uint64
}

func (msg *AdoptedSSDeleteRule) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 75
	p := 1
	p = WriteUint(msg.SheetID, buf, p)
	p = WriteUint(msg.Index, buf, p)
	return buf[:p]
}

func (msg *AdoptedSSDeleteRule) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AdoptedSSDeleteRule) Decode() Message {
	return msg
}

func (msg *AdoptedSSDeleteRule) TypeID() int {
	return 75
}

type AdoptedSSAddOwner struct {
	message
	SheetID uint64
	ID uint64
}

func (msg *AdoptedSSAddOwner) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 76
	p := 1
	p = WriteUint(msg.SheetID, buf, p)
	p = WriteUint(msg.ID, buf, p)
	return buf[:p]
}

func (msg *AdoptedSSAddOwner) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AdoptedSSAddOwner) Decode() Message {
	return msg
}

func (msg *AdoptedSSAddOwner) TypeID() int {
	return 76
}

type AdoptedSSRemoveOwner struct {
	message
	SheetID uint64
	ID uint64
}

func (msg *AdoptedSSRemoveOwner) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 77
	p := 1
	p = WriteUint(msg.SheetID, buf, p)
	p = WriteUint(msg.ID, buf, p)
	return buf[:p]
}

func (msg *AdoptedSSRemoveOwner) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *AdoptedSSRemoveOwner) Decode() Message {
	return msg
}

func (msg *AdoptedSSRemoveOwner) TypeID() int {
	return 77
}

type Zustand struct {
	message
	Mutation string
	State string
}

func (msg *Zustand) Encode() []byte {
	buf := make([]byte, 21+len(msg.Mutation)+len(msg.State))
	buf[0] = 79
	p := 1
	p = WriteString(msg.Mutation, buf, p)
	p = WriteString(msg.State, buf, p)
	return buf[:p]
}

func (msg *Zustand) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *Zustand) Decode() Message {
	return msg
}

func (msg *Zustand) TypeID() int {
	return 79
}

type JSException struct {
	message
	Name     string
	Message  string
	Payload  string
	Metadata string
}

func (msg *JSException) Encode() []byte {
	buf := make([]byte, 41+len(msg.Name)+len(msg.Message)+len(msg.Payload)+len(msg.Metadata))
	buf[0] = 78
	p := 1
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Message, buf, p)
	p = WriteString(msg.Payload, buf, p)
	p = WriteString(msg.Metadata, buf, p)
	return buf[:p]
}

func (msg *JSException) EncodeWithIndex() []byte {
	encoded := msg.Encode()
	if IsIOSType(msg.TypeID()) {
		return encoded
	}
	data := make([]byte, len(encoded)+8)
	copy(data[8:], encoded[:])
	binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
	return data
}

func (msg *JSException) Decode() Message {
	return msg
}

func (msg *JSException) TypeID() int {
	return 78
}

type SessionSearch struct {
	message
	Timestamp uint64
	Partition uint64
}

func (msg *SessionSearch) Encode() []byte {
	buf := make([]byte, 21)
	buf[0] = 127
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Partition, buf, p)
	return buf[:p]
}

func (msg *SessionSearch) EncodeWithIndex() []byte {
	encoded := msg.Encode()
	if IsIOSType(msg.TypeID()) {
		return encoded
	}
	data := make([]byte, len(encoded)+8)
	copy(data[8:], encoded[:])
	binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
	return data
}

func (msg *SessionSearch) Decode() Message {
	return msg
}

func (msg *SessionSearch) TypeID() int {
	return 127
}

type IOSBatchMeta struct {
	message
	Timestamp uint64
	Length uint64
	FirstIndex uint64
}

func (msg *IOSBatchMeta) Encode() []byte {
	buf := make([]byte, 31)
	buf[0] = 107
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteUint(msg.FirstIndex, buf, p)
	return buf[:p]
}

func (msg *IOSBatchMeta) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSBatchMeta) Decode() Message {
	return msg
}

func (msg *IOSBatchMeta) TypeID() int {
	return 107
}

type IOSSessionStart struct {
	message
	Timestamp uint64
	ProjectID uint64
	TrackerVersion string
	RevID string
	UserUUID string
	UserOS string
	UserOSVersion string
	UserDevice string
	UserDeviceType string
	UserCountry string
}

func (msg *IOSSessionStart) Encode() []byte {
	buf := make([]byte, 101+len(msg.TrackerVersion)+len(msg.RevID)+len(msg.UserUUID)+len(msg.UserOS)+len(msg.UserOSVersion)+len(msg.UserDevice)+len(msg.UserDeviceType)+len(msg.UserCountry))
	buf[0] = 90
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.ProjectID, buf, p)
	p = WriteString(msg.TrackerVersion, buf, p)
	p = WriteString(msg.RevID, buf, p)
	p = WriteString(msg.UserUUID, buf, p)
	p = WriteString(msg.UserOS, buf, p)
	p = WriteString(msg.UserOSVersion, buf, p)
	p = WriteString(msg.UserDevice, buf, p)
	p = WriteString(msg.UserDeviceType, buf, p)
	p = WriteString(msg.UserCountry, buf, p)
	return buf[:p]
}

func (msg *IOSSessionStart) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSSessionStart) Decode() Message {
	return msg
}

func (msg *IOSSessionStart) TypeID() int {
	return 90
}

type IOSSessionEnd struct {
	message
	Timestamp uint64
}

func (msg *IOSSessionEnd) Encode() []byte {
	buf := make([]byte, 11)
	buf[0] = 91
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	return buf[:p]
}

func (msg *IOSSessionEnd) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSSessionEnd) Decode() Message {
	return msg
}

func (msg *IOSSessionEnd) TypeID() int {
	return 91
}

type IOSMetadata struct {
	message
	Timestamp uint64
	Length uint64
	Key string
	Value string
}

func (msg *IOSMetadata) Encode() []byte {
	buf := make([]byte, 41+len(msg.Key)+len(msg.Value))
	buf[0] = 92
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Key, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *IOSMetadata) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSMetadata) Decode() Message {
	return msg
}

func (msg *IOSMetadata) TypeID() int {
	return 92
}

type IOSCustomEvent struct {
	message
	Timestamp uint64
	Length uint64
	Name string
	Payload string
}

func (msg *IOSCustomEvent) Encode() []byte {
	buf := make([]byte, 41+len(msg.Name)+len(msg.Payload))
	buf[0] = 93
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *IOSCustomEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSCustomEvent) Decode() Message {
	return msg
}

func (msg *IOSCustomEvent) TypeID() int {
	return 93
}

type IOSUserID struct {
	message
	Timestamp uint64
	Length uint64
	Value string
}

func (msg *IOSUserID) Encode() []byte {
	buf := make([]byte, 31+len(msg.Value))
	buf[0] = 94
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *IOSUserID) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSUserID) Decode() Message {
	return msg
}

func (msg *IOSUserID) TypeID() int {
	return 94
}

type IOSUserAnonymousID struct {
	message
	Timestamp uint64
	Length uint64
	Value string
}

func (msg *IOSUserAnonymousID) Encode() []byte {
	buf := make([]byte, 31+len(msg.Value))
	buf[0] = 95
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Value, buf, p)
	return buf[:p]
}

func (msg *IOSUserAnonymousID) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSUserAnonymousID) Decode() Message {
	return msg
}

func (msg *IOSUserAnonymousID) TypeID() int {
	return 95
}

type IOSScreenChanges struct {
	message
	Timestamp uint64
	Length uint64
	X uint64
	Y uint64
	Width uint64
	Height uint64
}

func (msg *IOSScreenChanges) Encode() []byte {
	buf := make([]byte, 61)
	buf[0] = 96
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteUint(msg.X, buf, p)
	p = WriteUint(msg.Y, buf, p)
	p = WriteUint(msg.Width, buf, p)
	p = WriteUint(msg.Height, buf, p)
	return buf[:p]
}

func (msg *IOSScreenChanges) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSScreenChanges) Decode() Message {
	return msg
}

func (msg *IOSScreenChanges) TypeID() int {
	return 96
}

type IOSCrash struct {
	message
	Timestamp uint64
	Length uint64
	Name string
	Reason string
	Stacktrace string
}

func (msg *IOSCrash) Encode() []byte {
	buf := make([]byte, 51+len(msg.Name)+len(msg.Reason)+len(msg.Stacktrace))
	buf[0] = 97
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteString(msg.Reason, buf, p)
	p = WriteString(msg.Stacktrace, buf, p)
	return buf[:p]
}

func (msg *IOSCrash) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSCrash) Decode() Message {
	return msg
}

func (msg *IOSCrash) TypeID() int {
	return 97
}

type IOSScreenEnter struct {
	message
	Timestamp uint64
	Length uint64
	Title string
	ViewName string
}

func (msg *IOSScreenEnter) Encode() []byte {
	buf := make([]byte, 41+len(msg.Title)+len(msg.ViewName))
	buf[0] = 98
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Title, buf, p)
	p = WriteString(msg.ViewName, buf, p)
	return buf[:p]
}

func (msg *IOSScreenEnter) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSScreenEnter) Decode() Message {
	return msg
}

func (msg *IOSScreenEnter) TypeID() int {
	return 98
}

type IOSScreenLeave struct {
	message
	Timestamp uint64
	Length uint64
	Title string
	ViewName string
}

func (msg *IOSScreenLeave) Encode() []byte {
	buf := make([]byte, 41+len(msg.Title)+len(msg.ViewName))
	buf[0] = 99
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Title, buf, p)
	p = WriteString(msg.ViewName, buf, p)
	return buf[:p]
}

func (msg *IOSScreenLeave) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSScreenLeave) Decode() Message {
	return msg
}

func (msg *IOSScreenLeave) TypeID() int {
	return 99
}

type IOSClickEvent struct {
	message
	Timestamp uint64
	Length uint64
	Label string
	X uint64
	Y uint64
}

func (msg *IOSClickEvent) Encode() []byte {
	buf := make([]byte, 51+len(msg.Label))
	buf[0] = 100
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Label, buf, p)
	p = WriteUint(msg.X, buf, p)
	p = WriteUint(msg.Y, buf, p)
	return buf[:p]
}

func (msg *IOSClickEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSClickEvent) Decode() Message {
	return msg
}

func (msg *IOSClickEvent) TypeID() int {
	return 100
}

type IOSInputEvent struct {
	message
	Timestamp uint64
	Length uint64
	Value string
	ValueMasked bool
	Label string
}

func (msg *IOSInputEvent) Encode() []byte {
	buf := make([]byte, 51+len(msg.Value)+len(msg.Label))
	buf[0] = 101
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Value, buf, p)
	p = WriteBoolean(msg.ValueMasked, buf, p)
	p = WriteString(msg.Label, buf, p)
	return buf[:p]
}

func (msg *IOSInputEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSInputEvent) Decode() Message {
	return msg
}

func (msg *IOSInputEvent) TypeID() int {
	return 101
}

type IOSPerformanceEvent struct {
	message
	Timestamp uint64
	Length uint64
	Name string
	Value uint64
}

func (msg *IOSPerformanceEvent) Encode() []byte {
	buf := make([]byte, 41+len(msg.Name))
	buf[0] = 102
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Name, buf, p)
	p = WriteUint(msg.Value, buf, p)
	return buf[:p]
}

func (msg *IOSPerformanceEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSPerformanceEvent) Decode() Message {
	return msg
}

func (msg *IOSPerformanceEvent) TypeID() int {
	return 102
}

type IOSLog struct {
	message
	Timestamp uint64
	Length uint64
	Severity string
	Content string
}

func (msg *IOSLog) Encode() []byte {
	buf := make([]byte, 41+len(msg.Severity)+len(msg.Content))
	buf[0] = 103
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Severity, buf, p)
	p = WriteString(msg.Content, buf, p)
	return buf[:p]
}

func (msg *IOSLog) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSLog) Decode() Message {
	return msg
}

func (msg *IOSLog) TypeID() int {
	return 103
}

type IOSInternalError struct {
	message
	Timestamp uint64
	Length uint64
	Content string
}

func (msg *IOSInternalError) Encode() []byte {
	buf := make([]byte, 31+len(msg.Content))
	buf[0] = 104
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteString(msg.Content, buf, p)
	return buf[:p]
}

func (msg *IOSInternalError) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSInternalError) Decode() Message {
	return msg
}

func (msg *IOSInternalError) TypeID() int {
	return 104
}

type IOSNetworkCall struct {
	message
	Timestamp uint64
	Length uint64
	Duration uint64
	Headers string
	Body string
	URL string
	Success bool
	Method string
	Status uint64
}

func (msg *IOSNetworkCall) Encode() []byte {
	buf := make([]byte, 91+len(msg.Headers)+len(msg.Body)+len(msg.URL)+len(msg.Method))
	buf[0] = 105
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteUint(msg.Length, buf, p)
	p = WriteUint(msg.Duration, buf, p)
	p = WriteString(msg.Headers, buf, p)
	p = WriteString(msg.Body, buf, p)
	p = WriteString(msg.URL, buf, p)
	p = WriteBoolean(msg.Success, buf, p)
	p = WriteString(msg.Method, buf, p)
	p = WriteUint(msg.Status, buf, p)
	return buf[:p]
}

func (msg *IOSNetworkCall) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSNetworkCall) Decode() Message {
	return msg
}

func (msg *IOSNetworkCall) TypeID() int {
	return 105
}

type IOSPerformanceAggregated struct {
	message
	TimestampStart uint64
	TimestampEnd uint64
	MinFPS uint64
	AvgFPS uint64
	MaxFPS uint64
	MinCPU uint64
	AvgCPU uint64
	MaxCPU uint64
	MinMemory uint64
	AvgMemory uint64
	MaxMemory uint64
	MinBattery uint64
	AvgBattery uint64
	MaxBattery uint64
}

func (msg *IOSPerformanceAggregated) Encode() []byte {
	buf := make([]byte, 141)
	buf[0] = 110
	p := 1
	p = WriteUint(msg.TimestampStart, buf, p)
	p = WriteUint(msg.TimestampEnd, buf, p)
	p = WriteUint(msg.MinFPS, buf, p)
	p = WriteUint(msg.AvgFPS, buf, p)
	p = WriteUint(msg.MaxFPS, buf, p)
	p = WriteUint(msg.MinCPU, buf, p)
	p = WriteUint(msg.AvgCPU, buf, p)
	p = WriteUint(msg.MaxCPU, buf, p)
	p = WriteUint(msg.MinMemory, buf, p)
	p = WriteUint(msg.AvgMemory, buf, p)
	p = WriteUint(msg.MaxMemory, buf, p)
	p = WriteUint(msg.MinBattery, buf, p)
	p = WriteUint(msg.AvgBattery, buf, p)
	p = WriteUint(msg.MaxBattery, buf, p)
	return buf[:p]
}

func (msg *IOSPerformanceAggregated) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSPerformanceAggregated) Decode() Message {
	return msg
}

func (msg *IOSPerformanceAggregated) TypeID() int {
	return 110
}

type IOSIssueEvent struct {
	message
	Timestamp uint64
	Type string
	ContextString string
	Context string
	Payload string
}

func (msg *IOSIssueEvent) Encode() []byte {
	buf := make([]byte, 51+len(msg.Type)+len(msg.ContextString)+len(msg.Context)+len(msg.Payload))
	buf[0] = 111
	p := 1
	p = WriteUint(msg.Timestamp, buf, p)
	p = WriteString(msg.Type, buf, p)
	p = WriteString(msg.ContextString, buf, p)
	p = WriteString(msg.Context, buf, p)
	p = WriteString(msg.Payload, buf, p)
	return buf[:p]
}

func (msg *IOSIssueEvent) EncodeWithIndex() []byte {
    encoded := msg.Encode()
    if IsIOSType(msg.TypeID()) {
        return encoded
    }
    data := make([]byte, len(encoded)+8)
    copy(data[8:], encoded[:])
    binary.LittleEndian.PutUint64(data[0:], msg.Meta().Index)
    return data
}

func (msg *IOSIssueEvent) Decode() Message {
	return msg
}

func (msg *IOSIssueEvent) TypeID() int {
	return 111
}

