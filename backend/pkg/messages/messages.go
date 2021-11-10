// Auto-generated, do not edit
package messages

type Message interface {
  Encode() []byte
  Meta() *meta
}

type meta struct {
  Timestamp int64
  Index uint64
  TypeID uint64
}

// Might also implement Encode() here (?)
func (m *meta) Meta() *meta {
  return m
}


type BatchMeta struct {
  *meta
  PageNo uint64
FirstIndex uint64
Timestamp int64
}
func (msg *BatchMeta) Encode() []byte{
  buf := make([]byte, 31 )
  buf[0] = 80
  p := 1
  p = WriteUint(msg.PageNo, buf, p)
p = WriteUint(msg.FirstIndex, buf, p)
p = WriteInt(msg.Timestamp, buf, p)
  return buf[:p]
}

type Timestamp struct {
  *meta
  Timestamp uint64
}
func (msg *Timestamp) Encode() []byte{
  buf := make([]byte, 11 )
  buf[0] = 0
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
  return buf[:p]
}

type SessionStart struct {
  *meta
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
}
func (msg *SessionStart) Encode() []byte{
  buf := make([]byte, 151 + len(msg.TrackerVersion)+ len(msg.RevID)+ len(msg.UserUUID)+ len(msg.UserAgent)+ len(msg.UserOS)+ len(msg.UserOSVersion)+ len(msg.UserBrowser)+ len(msg.UserBrowserVersion)+ len(msg.UserDevice)+ len(msg.UserDeviceType)+ len(msg.UserCountry))
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
  return buf[:p]
}

type SessionDisconnect struct {
  *meta
  Timestamp uint64
}
func (msg *SessionDisconnect) Encode() []byte{
  buf := make([]byte, 11 )
  buf[0] = 2
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
  return buf[:p]
}

type SessionEnd struct {
  *meta
  Timestamp uint64
}
func (msg *SessionEnd) Encode() []byte{
  buf := make([]byte, 11 )
  buf[0] = 3
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
  return buf[:p]
}

type SetPageLocation struct {
  *meta
  URL string
Referrer string
NavigationStart uint64
}
func (msg *SetPageLocation) Encode() []byte{
  buf := make([]byte, 31 + len(msg.URL)+ len(msg.Referrer))
  buf[0] = 4
  p := 1
  p = WriteString(msg.URL, buf, p)
p = WriteString(msg.Referrer, buf, p)
p = WriteUint(msg.NavigationStart, buf, p)
  return buf[:p]
}

type SetViewportSize struct {
  *meta
  Width uint64
Height uint64
}
func (msg *SetViewportSize) Encode() []byte{
  buf := make([]byte, 21 )
  buf[0] = 5
  p := 1
  p = WriteUint(msg.Width, buf, p)
p = WriteUint(msg.Height, buf, p)
  return buf[:p]
}

type SetViewportScroll struct {
  *meta
  X int64
Y int64
}
func (msg *SetViewportScroll) Encode() []byte{
  buf := make([]byte, 21 )
  buf[0] = 6
  p := 1
  p = WriteInt(msg.X, buf, p)
p = WriteInt(msg.Y, buf, p)
  return buf[:p]
}

type CreateDocument struct {
  *meta
  
}
func (msg *CreateDocument) Encode() []byte{
  buf := make([]byte, 1 )
  buf[0] = 7
  p := 1
  
  return buf[:p]
}

type CreateElementNode struct {
  *meta
  ID uint64
ParentID uint64
index uint64
Tag string
SVG bool
}
func (msg *CreateElementNode) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Tag))
  buf[0] = 8
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteUint(msg.ParentID, buf, p)
p = WriteUint(msg.index, buf, p)
p = WriteString(msg.Tag, buf, p)
p = WriteBoolean(msg.SVG, buf, p)
  return buf[:p]
}

type CreateTextNode struct {
  *meta
  ID uint64
ParentID uint64
Index uint64
}
func (msg *CreateTextNode) Encode() []byte{
  buf := make([]byte, 31 )
  buf[0] = 9
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteUint(msg.ParentID, buf, p)
p = WriteUint(msg.Index, buf, p)
  return buf[:p]
}

type MoveNode struct {
  *meta
  ID uint64
ParentID uint64
Index uint64
}
func (msg *MoveNode) Encode() []byte{
  buf := make([]byte, 31 )
  buf[0] = 10
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteUint(msg.ParentID, buf, p)
p = WriteUint(msg.Index, buf, p)
  return buf[:p]
}

type RemoveNode struct {
  *meta
  ID uint64
}
func (msg *RemoveNode) Encode() []byte{
  buf := make([]byte, 11 )
  buf[0] = 11
  p := 1
  p = WriteUint(msg.ID, buf, p)
  return buf[:p]
}

type SetNodeAttribute struct {
  *meta
  ID uint64
Name string
Value string
}
func (msg *SetNodeAttribute) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Name)+ len(msg.Value))
  buf[0] = 12
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type RemoveNodeAttribute struct {
  *meta
  ID uint64
Name string
}
func (msg *RemoveNodeAttribute) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Name))
  buf[0] = 13
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Name, buf, p)
  return buf[:p]
}

type SetNodeData struct {
  *meta
  ID uint64
Data string
}
func (msg *SetNodeData) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Data))
  buf[0] = 14
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Data, buf, p)
  return buf[:p]
}

type SetCSSData struct {
  *meta
  ID uint64
Data string
}
func (msg *SetCSSData) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Data))
  buf[0] = 15
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Data, buf, p)
  return buf[:p]
}

type SetNodeScroll struct {
  *meta
  ID uint64
X int64
Y int64
}
func (msg *SetNodeScroll) Encode() []byte{
  buf := make([]byte, 31 )
  buf[0] = 16
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteInt(msg.X, buf, p)
p = WriteInt(msg.Y, buf, p)
  return buf[:p]
}

type SetInputTarget struct {
  *meta
  ID uint64
Label string
}
func (msg *SetInputTarget) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Label))
  buf[0] = 17
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Label, buf, p)
  return buf[:p]
}

type SetInputValue struct {
  *meta
  ID uint64
Value string
Mask int64
}
func (msg *SetInputValue) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Value))
  buf[0] = 18
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Value, buf, p)
p = WriteInt(msg.Mask, buf, p)
  return buf[:p]
}

type SetInputChecked struct {
  *meta
  ID uint64
Checked bool
}
func (msg *SetInputChecked) Encode() []byte{
  buf := make([]byte, 21 )
  buf[0] = 19
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteBoolean(msg.Checked, buf, p)
  return buf[:p]
}

type MouseMove struct {
  *meta
  X uint64
Y uint64
}
func (msg *MouseMove) Encode() []byte{
  buf := make([]byte, 21 )
  buf[0] = 20
  p := 1
  p = WriteUint(msg.X, buf, p)
p = WriteUint(msg.Y, buf, p)
  return buf[:p]
}

type MouseClickDepricated struct {
  *meta
  ID uint64
HesitationTime uint64
Label string
}
func (msg *MouseClickDepricated) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Label))
  buf[0] = 21
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteUint(msg.HesitationTime, buf, p)
p = WriteString(msg.Label, buf, p)
  return buf[:p]
}

type ConsoleLog struct {
  *meta
  Level string
Value string
}
func (msg *ConsoleLog) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Level)+ len(msg.Value))
  buf[0] = 22
  p := 1
  p = WriteString(msg.Level, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type PageLoadTiming struct {
  *meta
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
func (msg *PageLoadTiming) Encode() []byte{
  buf := make([]byte, 91 )
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

type PageRenderTiming struct {
  *meta
  SpeedIndex uint64
VisuallyComplete uint64
TimeToInteractive uint64
}
func (msg *PageRenderTiming) Encode() []byte{
  buf := make([]byte, 31 )
  buf[0] = 24
  p := 1
  p = WriteUint(msg.SpeedIndex, buf, p)
p = WriteUint(msg.VisuallyComplete, buf, p)
p = WriteUint(msg.TimeToInteractive, buf, p)
  return buf[:p]
}

type JSException struct {
  *meta
  Name string
Message string
Payload string
}
func (msg *JSException) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Name)+ len(msg.Message)+ len(msg.Payload))
  buf[0] = 25
  p := 1
  p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Message, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

type RawErrorEvent struct {
  *meta
  Timestamp uint64
Source string
Name string
Message string
Payload string
}
func (msg *RawErrorEvent) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Source)+ len(msg.Name)+ len(msg.Message)+ len(msg.Payload))
  buf[0] = 26
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteString(msg.Source, buf, p)
p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Message, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

type RawCustomEvent struct {
  *meta
  Name string
Payload string
}
func (msg *RawCustomEvent) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Name)+ len(msg.Payload))
  buf[0] = 27
  p := 1
  p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

type UserID struct {
  *meta
  ID string
}
func (msg *UserID) Encode() []byte{
  buf := make([]byte, 11 + len(msg.ID))
  buf[0] = 28
  p := 1
  p = WriteString(msg.ID, buf, p)
  return buf[:p]
}

type UserAnonymousID struct {
  *meta
  ID string
}
func (msg *UserAnonymousID) Encode() []byte{
  buf := make([]byte, 11 + len(msg.ID))
  buf[0] = 29
  p := 1
  p = WriteString(msg.ID, buf, p)
  return buf[:p]
}

type Metadata struct {
  *meta
  Key string
Value string
}
func (msg *Metadata) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Key)+ len(msg.Value))
  buf[0] = 30
  p := 1
  p = WriteString(msg.Key, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type PageEvent struct {
  *meta
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
func (msg *PageEvent) Encode() []byte{
  buf := make([]byte, 171 + len(msg.URL)+ len(msg.Referrer))
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

type InputEvent struct {
  *meta
  MessageID uint64
Timestamp uint64
Value string
ValueMasked bool
Label string
}
func (msg *InputEvent) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Value)+ len(msg.Label))
  buf[0] = 32
  p := 1
  p = WriteUint(msg.MessageID, buf, p)
p = WriteUint(msg.Timestamp, buf, p)
p = WriteString(msg.Value, buf, p)
p = WriteBoolean(msg.ValueMasked, buf, p)
p = WriteString(msg.Label, buf, p)
  return buf[:p]
}

type ClickEvent struct {
  *meta
  MessageID uint64
Timestamp uint64
HesitationTime uint64
Label string
Selector string
}
func (msg *ClickEvent) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Label)+ len(msg.Selector))
  buf[0] = 33
  p := 1
  p = WriteUint(msg.MessageID, buf, p)
p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.HesitationTime, buf, p)
p = WriteString(msg.Label, buf, p)
p = WriteString(msg.Selector, buf, p)
  return buf[:p]
}

type ErrorEvent struct {
  *meta
  MessageID uint64
Timestamp uint64
Source string
Name string
Message string
Payload string
}
func (msg *ErrorEvent) Encode() []byte{
  buf := make([]byte, 61 + len(msg.Source)+ len(msg.Name)+ len(msg.Message)+ len(msg.Payload))
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

type ResourceEvent struct {
  *meta
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
func (msg *ResourceEvent) Encode() []byte{
  buf := make([]byte, 121 + len(msg.URL)+ len(msg.Type)+ len(msg.Method))
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

type CustomEvent struct {
  *meta
  MessageID uint64
Timestamp uint64
Name string
Payload string
}
func (msg *CustomEvent) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Name)+ len(msg.Payload))
  buf[0] = 36
  p := 1
  p = WriteUint(msg.MessageID, buf, p)
p = WriteUint(msg.Timestamp, buf, p)
p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

type CSSInsertRule struct {
  *meta
  ID uint64
Rule string
Index uint64
}
func (msg *CSSInsertRule) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Rule))
  buf[0] = 37
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Rule, buf, p)
p = WriteUint(msg.Index, buf, p)
  return buf[:p]
}

type CSSDeleteRule struct {
  *meta
  ID uint64
Index uint64
}
func (msg *CSSDeleteRule) Encode() []byte{
  buf := make([]byte, 21 )
  buf[0] = 38
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteUint(msg.Index, buf, p)
  return buf[:p]
}

type Fetch struct {
  *meta
  Method string
URL string
Request string
Response string
Status uint64
Timestamp uint64
Duration uint64
}
func (msg *Fetch) Encode() []byte{
  buf := make([]byte, 71 + len(msg.Method)+ len(msg.URL)+ len(msg.Request)+ len(msg.Response))
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

type Profiler struct {
  *meta
  Name string
Duration uint64
Args string
Result string
}
func (msg *Profiler) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Name)+ len(msg.Args)+ len(msg.Result))
  buf[0] = 40
  p := 1
  p = WriteString(msg.Name, buf, p)
p = WriteUint(msg.Duration, buf, p)
p = WriteString(msg.Args, buf, p)
p = WriteString(msg.Result, buf, p)
  return buf[:p]
}

type OTable struct {
  *meta
  Key string
Value string
}
func (msg *OTable) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Key)+ len(msg.Value))
  buf[0] = 41
  p := 1
  p = WriteString(msg.Key, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type StateAction struct {
  *meta
  Type string
}
func (msg *StateAction) Encode() []byte{
  buf := make([]byte, 11 + len(msg.Type))
  buf[0] = 42
  p := 1
  p = WriteString(msg.Type, buf, p)
  return buf[:p]
}

type StateActionEvent struct {
  *meta
  MessageID uint64
Timestamp uint64
Type string
}
func (msg *StateActionEvent) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Type))
  buf[0] = 43
  p := 1
  p = WriteUint(msg.MessageID, buf, p)
p = WriteUint(msg.Timestamp, buf, p)
p = WriteString(msg.Type, buf, p)
  return buf[:p]
}

type Redux struct {
  *meta
  Action string
State string
Duration uint64
}
func (msg *Redux) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Action)+ len(msg.State))
  buf[0] = 44
  p := 1
  p = WriteString(msg.Action, buf, p)
p = WriteString(msg.State, buf, p)
p = WriteUint(msg.Duration, buf, p)
  return buf[:p]
}

type Vuex struct {
  *meta
  Mutation string
State string
}
func (msg *Vuex) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Mutation)+ len(msg.State))
  buf[0] = 45
  p := 1
  p = WriteString(msg.Mutation, buf, p)
p = WriteString(msg.State, buf, p)
  return buf[:p]
}

type MobX struct {
  *meta
  Type string
Payload string
}
func (msg *MobX) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Type)+ len(msg.Payload))
  buf[0] = 46
  p := 1
  p = WriteString(msg.Type, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

type NgRx struct {
  *meta
  Action string
State string
Duration uint64
}
func (msg *NgRx) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Action)+ len(msg.State))
  buf[0] = 47
  p := 1
  p = WriteString(msg.Action, buf, p)
p = WriteString(msg.State, buf, p)
p = WriteUint(msg.Duration, buf, p)
  return buf[:p]
}

type GraphQL struct {
  *meta
  OperationKind string
OperationName string
Variables string
Response string
}
func (msg *GraphQL) Encode() []byte{
  buf := make([]byte, 41 + len(msg.OperationKind)+ len(msg.OperationName)+ len(msg.Variables)+ len(msg.Response))
  buf[0] = 48
  p := 1
  p = WriteString(msg.OperationKind, buf, p)
p = WriteString(msg.OperationName, buf, p)
p = WriteString(msg.Variables, buf, p)
p = WriteString(msg.Response, buf, p)
  return buf[:p]
}

type PerformanceTrack struct {
  *meta
  Frames int64
Ticks int64
TotalJSHeapSize uint64
UsedJSHeapSize uint64
}
func (msg *PerformanceTrack) Encode() []byte{
  buf := make([]byte, 41 )
  buf[0] = 49
  p := 1
  p = WriteInt(msg.Frames, buf, p)
p = WriteInt(msg.Ticks, buf, p)
p = WriteUint(msg.TotalJSHeapSize, buf, p)
p = WriteUint(msg.UsedJSHeapSize, buf, p)
  return buf[:p]
}

type GraphQLEvent struct {
  *meta
  MessageID uint64
Timestamp uint64
Name string
}
func (msg *GraphQLEvent) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Name))
  buf[0] = 50
  p := 1
  p = WriteUint(msg.MessageID, buf, p)
p = WriteUint(msg.Timestamp, buf, p)
p = WriteString(msg.Name, buf, p)
  return buf[:p]
}

type DOMDrop struct {
  *meta
  Timestamp uint64
}
func (msg *DOMDrop) Encode() []byte{
  buf := make([]byte, 11 )
  buf[0] = 52
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
  return buf[:p]
}

type ResourceTiming struct {
  *meta
  Timestamp uint64
Duration uint64
TTFB uint64
HeaderSize uint64
EncodedBodySize uint64
DecodedBodySize uint64
URL string
Initiator string
}
func (msg *ResourceTiming) Encode() []byte{
  buf := make([]byte, 81 + len(msg.URL)+ len(msg.Initiator))
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

type ConnectionInformation struct {
  *meta
  Downlink uint64
Type string
}
func (msg *ConnectionInformation) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Type))
  buf[0] = 54
  p := 1
  p = WriteUint(msg.Downlink, buf, p)
p = WriteString(msg.Type, buf, p)
  return buf[:p]
}

type SetPageVisibility struct {
  *meta
  hidden bool
}
func (msg *SetPageVisibility) Encode() []byte{
  buf := make([]byte, 11 )
  buf[0] = 55
  p := 1
  p = WriteBoolean(msg.hidden, buf, p)
  return buf[:p]
}

type PerformanceTrackAggr struct {
  *meta
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
func (msg *PerformanceTrackAggr) Encode() []byte{
  buf := make([]byte, 141 )
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

type LongTask struct {
  *meta
  Timestamp uint64
Duration uint64
Context uint64
ContainerType uint64
ContainerSrc string
ContainerId string
ContainerName string
}
func (msg *LongTask) Encode() []byte{
  buf := make([]byte, 71 + len(msg.ContainerSrc)+ len(msg.ContainerId)+ len(msg.ContainerName))
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

type SetNodeAttributeURLBased struct {
  *meta
  ID uint64
Name string
Value string
BaseURL string
}
func (msg *SetNodeAttributeURLBased) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Name)+ len(msg.Value)+ len(msg.BaseURL))
  buf[0] = 60
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Value, buf, p)
p = WriteString(msg.BaseURL, buf, p)
  return buf[:p]
}

type SetCSSDataURLBased struct {
  *meta
  ID uint64
Data string
BaseURL string
}
func (msg *SetCSSDataURLBased) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Data)+ len(msg.BaseURL))
  buf[0] = 61
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Data, buf, p)
p = WriteString(msg.BaseURL, buf, p)
  return buf[:p]
}

type IssueEvent struct {
  *meta
  MessageID uint64
Timestamp uint64
Type string
ContextString string
Context string
Payload string
}
func (msg *IssueEvent) Encode() []byte{
  buf := make([]byte, 61 + len(msg.Type)+ len(msg.ContextString)+ len(msg.Context)+ len(msg.Payload))
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

type TechnicalInfo struct {
  *meta
  Type string
Value string
}
func (msg *TechnicalInfo) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Type)+ len(msg.Value))
  buf[0] = 63
  p := 1
  p = WriteString(msg.Type, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type CustomIssue struct {
  *meta
  Name string
Payload string
}
func (msg *CustomIssue) Encode() []byte{
  buf := make([]byte, 21 + len(msg.Name)+ len(msg.Payload))
  buf[0] = 64
  p := 1
  p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

type PageClose struct {
  *meta
  
}
func (msg *PageClose) Encode() []byte{
  buf := make([]byte, 1 )
  buf[0] = 65
  p := 1
  
  return buf[:p]
}

type AssetCache struct {
  *meta
  URL string
}
func (msg *AssetCache) Encode() []byte{
  buf := make([]byte, 11 + len(msg.URL))
  buf[0] = 66
  p := 1
  p = WriteString(msg.URL, buf, p)
  return buf[:p]
}

type CSSInsertRuleURLBased struct {
  *meta
  ID uint64
Rule string
Index uint64
BaseURL string
}
func (msg *CSSInsertRuleURLBased) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Rule)+ len(msg.BaseURL))
  buf[0] = 67
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteString(msg.Rule, buf, p)
p = WriteUint(msg.Index, buf, p)
p = WriteString(msg.BaseURL, buf, p)
  return buf[:p]
}

type MouseClick struct {
  *meta
  ID uint64
HesitationTime uint64
Label string
Selector string
}
func (msg *MouseClick) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Label)+ len(msg.Selector))
  buf[0] = 69
  p := 1
  p = WriteUint(msg.ID, buf, p)
p = WriteUint(msg.HesitationTime, buf, p)
p = WriteString(msg.Label, buf, p)
p = WriteString(msg.Selector, buf, p)
  return buf[:p]
}

type CreateIFrameDocument struct {
  *meta
  FrameID uint64
ID uint64
}
func (msg *CreateIFrameDocument) Encode() []byte{
  buf := make([]byte, 21 )
  buf[0] = 70
  p := 1
  p = WriteUint(msg.FrameID, buf, p)
p = WriteUint(msg.ID, buf, p)
  return buf[:p]
}

type IOSBatchMeta struct {
  *meta
  Timestamp uint64
Length uint64
FirstIndex uint64
}
func (msg *IOSBatchMeta) Encode() []byte{
  buf := make([]byte, 31 )
  buf[0] = 107
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteUint(msg.FirstIndex, buf, p)
  return buf[:p]
}

type IOSSessionStart struct {
  *meta
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
func (msg *IOSSessionStart) Encode() []byte{
  buf := make([]byte, 101 + len(msg.TrackerVersion)+ len(msg.RevID)+ len(msg.UserUUID)+ len(msg.UserOS)+ len(msg.UserOSVersion)+ len(msg.UserDevice)+ len(msg.UserDeviceType)+ len(msg.UserCountry))
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

type IOSSessionEnd struct {
  *meta
  Timestamp uint64
}
func (msg *IOSSessionEnd) Encode() []byte{
  buf := make([]byte, 11 )
  buf[0] = 91
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
  return buf[:p]
}

type IOSMetadata struct {
  *meta
  Timestamp uint64
Length uint64
Key string
Value string
}
func (msg *IOSMetadata) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Key)+ len(msg.Value))
  buf[0] = 92
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Key, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type IOSCustomEvent struct {
  *meta
  Timestamp uint64
Length uint64
Name string
Payload string
}
func (msg *IOSCustomEvent) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Name)+ len(msg.Payload))
  buf[0] = 93
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

type IOSUserID struct {
  *meta
  Timestamp uint64
Length uint64
Value string
}
func (msg *IOSUserID) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Value))
  buf[0] = 94
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type IOSUserAnonymousID struct {
  *meta
  Timestamp uint64
Length uint64
Value string
}
func (msg *IOSUserAnonymousID) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Value))
  buf[0] = 95
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Value, buf, p)
  return buf[:p]
}

type IOSScreenChanges struct {
  *meta
  Timestamp uint64
Length uint64
X uint64
Y uint64
Width uint64
Height uint64
}
func (msg *IOSScreenChanges) Encode() []byte{
  buf := make([]byte, 61 )
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

type IOSCrash struct {
  *meta
  Timestamp uint64
Length uint64
Name string
Reason string
Stacktrace string
}
func (msg *IOSCrash) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Name)+ len(msg.Reason)+ len(msg.Stacktrace))
  buf[0] = 97
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Name, buf, p)
p = WriteString(msg.Reason, buf, p)
p = WriteString(msg.Stacktrace, buf, p)
  return buf[:p]
}

type IOSScreenEnter struct {
  *meta
  Timestamp uint64
Length uint64
Title string
ViewName string
}
func (msg *IOSScreenEnter) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Title)+ len(msg.ViewName))
  buf[0] = 98
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Title, buf, p)
p = WriteString(msg.ViewName, buf, p)
  return buf[:p]
}

type IOSScreenLeave struct {
  *meta
  Timestamp uint64
Length uint64
Title string
ViewName string
}
func (msg *IOSScreenLeave) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Title)+ len(msg.ViewName))
  buf[0] = 99
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Title, buf, p)
p = WriteString(msg.ViewName, buf, p)
  return buf[:p]
}

type IOSClickEvent struct {
  *meta
  Timestamp uint64
Length uint64
Label string
X uint64
Y uint64
}
func (msg *IOSClickEvent) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Label))
  buf[0] = 100
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Label, buf, p)
p = WriteUint(msg.X, buf, p)
p = WriteUint(msg.Y, buf, p)
  return buf[:p]
}

type IOSInputEvent struct {
  *meta
  Timestamp uint64
Length uint64
Value string
ValueMasked bool
Label string
}
func (msg *IOSInputEvent) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Value)+ len(msg.Label))
  buf[0] = 101
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Value, buf, p)
p = WriteBoolean(msg.ValueMasked, buf, p)
p = WriteString(msg.Label, buf, p)
  return buf[:p]
}

type IOSPerformanceEvent struct {
  *meta
  Timestamp uint64
Length uint64
Name string
Value uint64
}
func (msg *IOSPerformanceEvent) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Name))
  buf[0] = 102
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Name, buf, p)
p = WriteUint(msg.Value, buf, p)
  return buf[:p]
}

type IOSLog struct {
  *meta
  Timestamp uint64
Length uint64
Severity string
Content string
}
func (msg *IOSLog) Encode() []byte{
  buf := make([]byte, 41 + len(msg.Severity)+ len(msg.Content))
  buf[0] = 103
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Severity, buf, p)
p = WriteString(msg.Content, buf, p)
  return buf[:p]
}

type IOSInternalError struct {
  *meta
  Timestamp uint64
Length uint64
Content string
}
func (msg *IOSInternalError) Encode() []byte{
  buf := make([]byte, 31 + len(msg.Content))
  buf[0] = 104
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteUint(msg.Length, buf, p)
p = WriteString(msg.Content, buf, p)
  return buf[:p]
}

type IOSNetworkCall struct {
  *meta
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
func (msg *IOSNetworkCall) Encode() []byte{
  buf := make([]byte, 91 + len(msg.Headers)+ len(msg.Body)+ len(msg.URL)+ len(msg.Method))
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

type IOSPerformanceAggregated struct {
  *meta
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
func (msg *IOSPerformanceAggregated) Encode() []byte{
  buf := make([]byte, 141 )
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

type IOSIssueEvent struct {
  *meta
  Timestamp uint64
Type string
ContextString string
Context string
Payload string
}
func (msg *IOSIssueEvent) Encode() []byte{
  buf := make([]byte, 51 + len(msg.Type)+ len(msg.ContextString)+ len(msg.Context)+ len(msg.Payload))
  buf[0] = 111
  p := 1
  p = WriteUint(msg.Timestamp, buf, p)
p = WriteString(msg.Type, buf, p)
p = WriteString(msg.ContextString, buf, p)
p = WriteString(msg.Context, buf, p)
p = WriteString(msg.Payload, buf, p)
  return buf[:p]
}

