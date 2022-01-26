// Auto-generated, do not edit
package messages

import (
  "fmt"
  "io"
)

func ReadMessage(reader io.Reader) (Message, error) {
  t, err := ReadUint(reader);
  if err != nil {
    return nil, err
  }
  switch t {
  
    case 80:
      msg := &BatchMeta{ meta: &meta{ TypeID: 80} }
      if msg.PageNo, err = ReadUint(reader); err != nil { return nil, err }
if msg.FirstIndex, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadInt(reader); err != nil { return nil, err }
      return msg, nil
  
    case 0:
      msg := &Timestamp{ meta: &meta{ TypeID: 0} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 1:
      msg := &SessionStart{ meta: &meta{ TypeID: 1} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.ProjectID, err = ReadUint(reader); err != nil { return nil, err }
if msg.TrackerVersion, err = ReadString(reader); err != nil { return nil, err }
if msg.RevID, err = ReadString(reader); err != nil { return nil, err }
if msg.UserUUID, err = ReadString(reader); err != nil { return nil, err }
if msg.UserAgent, err = ReadString(reader); err != nil { return nil, err }
if msg.UserOS, err = ReadString(reader); err != nil { return nil, err }
if msg.UserOSVersion, err = ReadString(reader); err != nil { return nil, err }
if msg.UserBrowser, err = ReadString(reader); err != nil { return nil, err }
if msg.UserBrowserVersion, err = ReadString(reader); err != nil { return nil, err }
if msg.UserDevice, err = ReadString(reader); err != nil { return nil, err }
if msg.UserDeviceType, err = ReadString(reader); err != nil { return nil, err }
if msg.UserDeviceMemorySize, err = ReadUint(reader); err != nil { return nil, err }
if msg.UserDeviceHeapSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.UserCountry, err = ReadString(reader); err != nil { return nil, err }
if msg.UserID, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 2:
      msg := &SessionDisconnect{ meta: &meta{ TypeID: 2} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 3:
      msg := &SessionEnd{ meta: &meta{ TypeID: 3} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 4:
      msg := &SetPageLocation{ meta: &meta{ TypeID: 4} }
      if msg.URL, err = ReadString(reader); err != nil { return nil, err }
if msg.Referrer, err = ReadString(reader); err != nil { return nil, err }
if msg.NavigationStart, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 5:
      msg := &SetViewportSize{ meta: &meta{ TypeID: 5} }
      if msg.Width, err = ReadUint(reader); err != nil { return nil, err }
if msg.Height, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 6:
      msg := &SetViewportScroll{ meta: &meta{ TypeID: 6} }
      if msg.X, err = ReadInt(reader); err != nil { return nil, err }
if msg.Y, err = ReadInt(reader); err != nil { return nil, err }
      return msg, nil
  
    case 7:
      msg := &CreateDocument{ meta: &meta{ TypeID: 7} }
      
      return msg, nil
  
    case 8:
      msg := &CreateElementNode{ meta: &meta{ TypeID: 8} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.ParentID, err = ReadUint(reader); err != nil { return nil, err }
if msg.index, err = ReadUint(reader); err != nil { return nil, err }
if msg.Tag, err = ReadString(reader); err != nil { return nil, err }
if msg.SVG, err = ReadBoolean(reader); err != nil { return nil, err }
      return msg, nil
  
    case 9:
      msg := &CreateTextNode{ meta: &meta{ TypeID: 9} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.ParentID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Index, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 10:
      msg := &MoveNode{ meta: &meta{ TypeID: 10} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.ParentID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Index, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 11:
      msg := &RemoveNode{ meta: &meta{ TypeID: 11} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 12:
      msg := &SetNodeAttribute{ meta: &meta{ TypeID: 12} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 13:
      msg := &RemoveNodeAttribute{ meta: &meta{ TypeID: 13} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 14:
      msg := &SetNodeData{ meta: &meta{ TypeID: 14} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Data, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 15:
      msg := &SetCSSData{ meta: &meta{ TypeID: 15} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Data, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 16:
      msg := &SetNodeScroll{ meta: &meta{ TypeID: 16} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.X, err = ReadInt(reader); err != nil { return nil, err }
if msg.Y, err = ReadInt(reader); err != nil { return nil, err }
      return msg, nil
  
    case 17:
      msg := &SetInputTarget{ meta: &meta{ TypeID: 17} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Label, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 18:
      msg := &SetInputValue{ meta: &meta{ TypeID: 18} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
if msg.Mask, err = ReadInt(reader); err != nil { return nil, err }
      return msg, nil
  
    case 19:
      msg := &SetInputChecked{ meta: &meta{ TypeID: 19} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Checked, err = ReadBoolean(reader); err != nil { return nil, err }
      return msg, nil
  
    case 20:
      msg := &MouseMove{ meta: &meta{ TypeID: 20} }
      if msg.X, err = ReadUint(reader); err != nil { return nil, err }
if msg.Y, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 21:
      msg := &MouseClickDepricated{ meta: &meta{ TypeID: 21} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.HesitationTime, err = ReadUint(reader); err != nil { return nil, err }
if msg.Label, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 22:
      msg := &ConsoleLog{ meta: &meta{ TypeID: 22} }
      if msg.Level, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 23:
      msg := &PageLoadTiming{ meta: &meta{ TypeID: 23} }
      if msg.RequestStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.ResponseStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.ResponseEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.DomContentLoadedEventStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.DomContentLoadedEventEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.LoadEventStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.LoadEventEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.FirstPaint, err = ReadUint(reader); err != nil { return nil, err }
if msg.FirstContentfulPaint, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 24:
      msg := &PageRenderTiming{ meta: &meta{ TypeID: 24} }
      if msg.SpeedIndex, err = ReadUint(reader); err != nil { return nil, err }
if msg.VisuallyComplete, err = ReadUint(reader); err != nil { return nil, err }
if msg.TimeToInteractive, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 25:
      msg := &JSException{ meta: &meta{ TypeID: 25} }
      if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Message, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 26:
      msg := &RawErrorEvent{ meta: &meta{ TypeID: 26} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Source, err = ReadString(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Message, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 27:
      msg := &RawCustomEvent{ meta: &meta{ TypeID: 27} }
      if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 28:
      msg := &UserID{ meta: &meta{ TypeID: 28} }
      if msg.ID, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 29:
      msg := &UserAnonymousID{ meta: &meta{ TypeID: 29} }
      if msg.ID, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 30:
      msg := &Metadata{ meta: &meta{ TypeID: 30} }
      if msg.Key, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 31:
      msg := &PageEvent{ meta: &meta{ TypeID: 31} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.URL, err = ReadString(reader); err != nil { return nil, err }
if msg.Referrer, err = ReadString(reader); err != nil { return nil, err }
if msg.Loaded, err = ReadBoolean(reader); err != nil { return nil, err }
if msg.RequestStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.ResponseStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.ResponseEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.DomContentLoadedEventStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.DomContentLoadedEventEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.LoadEventStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.LoadEventEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.FirstPaint, err = ReadUint(reader); err != nil { return nil, err }
if msg.FirstContentfulPaint, err = ReadUint(reader); err != nil { return nil, err }
if msg.SpeedIndex, err = ReadUint(reader); err != nil { return nil, err }
if msg.VisuallyComplete, err = ReadUint(reader); err != nil { return nil, err }
if msg.TimeToInteractive, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 32:
      msg := &InputEvent{ meta: &meta{ TypeID: 32} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
if msg.ValueMasked, err = ReadBoolean(reader); err != nil { return nil, err }
if msg.Label, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 33:
      msg := &ClickEvent{ meta: &meta{ TypeID: 33} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.HesitationTime, err = ReadUint(reader); err != nil { return nil, err }
if msg.Label, err = ReadString(reader); err != nil { return nil, err }
if msg.Selector, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 34:
      msg := &ErrorEvent{ meta: &meta{ TypeID: 34} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Source, err = ReadString(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Message, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 35:
      msg := &ResourceEvent{ meta: &meta{ TypeID: 35} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
if msg.TTFB, err = ReadUint(reader); err != nil { return nil, err }
if msg.HeaderSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.EncodedBodySize, err = ReadUint(reader); err != nil { return nil, err }
if msg.DecodedBodySize, err = ReadUint(reader); err != nil { return nil, err }
if msg.URL, err = ReadString(reader); err != nil { return nil, err }
if msg.Type, err = ReadString(reader); err != nil { return nil, err }
if msg.Success, err = ReadBoolean(reader); err != nil { return nil, err }
if msg.Method, err = ReadString(reader); err != nil { return nil, err }
if msg.Status, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 36:
      msg := &CustomEvent{ meta: &meta{ TypeID: 36} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 37:
      msg := &CSSInsertRule{ meta: &meta{ TypeID: 37} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Rule, err = ReadString(reader); err != nil { return nil, err }
if msg.Index, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 38:
      msg := &CSSDeleteRule{ meta: &meta{ TypeID: 38} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Index, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 39:
      msg := &Fetch{ meta: &meta{ TypeID: 39} }
      if msg.Method, err = ReadString(reader); err != nil { return nil, err }
if msg.URL, err = ReadString(reader); err != nil { return nil, err }
if msg.Request, err = ReadString(reader); err != nil { return nil, err }
if msg.Response, err = ReadString(reader); err != nil { return nil, err }
if msg.Status, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 40:
      msg := &Profiler{ meta: &meta{ TypeID: 40} }
      if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
if msg.Args, err = ReadString(reader); err != nil { return nil, err }
if msg.Result, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 41:
      msg := &OTable{ meta: &meta{ TypeID: 41} }
      if msg.Key, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 42:
      msg := &StateAction{ meta: &meta{ TypeID: 42} }
      if msg.Type, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 43:
      msg := &StateActionEvent{ meta: &meta{ TypeID: 43} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Type, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 44:
      msg := &Redux{ meta: &meta{ TypeID: 44} }
      if msg.Action, err = ReadString(reader); err != nil { return nil, err }
if msg.State, err = ReadString(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 45:
      msg := &Vuex{ meta: &meta{ TypeID: 45} }
      if msg.Mutation, err = ReadString(reader); err != nil { return nil, err }
if msg.State, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 46:
      msg := &MobX{ meta: &meta{ TypeID: 46} }
      if msg.Type, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 47:
      msg := &NgRx{ meta: &meta{ TypeID: 47} }
      if msg.Action, err = ReadString(reader); err != nil { return nil, err }
if msg.State, err = ReadString(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 48:
      msg := &GraphQL{ meta: &meta{ TypeID: 48} }
      if msg.OperationKind, err = ReadString(reader); err != nil { return nil, err }
if msg.OperationName, err = ReadString(reader); err != nil { return nil, err }
if msg.Variables, err = ReadString(reader); err != nil { return nil, err }
if msg.Response, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 49:
      msg := &PerformanceTrack{ meta: &meta{ TypeID: 49} }
      if msg.Frames, err = ReadInt(reader); err != nil { return nil, err }
if msg.Ticks, err = ReadInt(reader); err != nil { return nil, err }
if msg.TotalJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.UsedJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 50:
      msg := &GraphQLEvent{ meta: &meta{ TypeID: 50} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 52:
      msg := &DOMDrop{ meta: &meta{ TypeID: 52} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 53:
      msg := &ResourceTiming{ meta: &meta{ TypeID: 53} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
if msg.TTFB, err = ReadUint(reader); err != nil { return nil, err }
if msg.HeaderSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.EncodedBodySize, err = ReadUint(reader); err != nil { return nil, err }
if msg.DecodedBodySize, err = ReadUint(reader); err != nil { return nil, err }
if msg.URL, err = ReadString(reader); err != nil { return nil, err }
if msg.Initiator, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 54:
      msg := &ConnectionInformation{ meta: &meta{ TypeID: 54} }
      if msg.Downlink, err = ReadUint(reader); err != nil { return nil, err }
if msg.Type, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 55:
      msg := &SetPageVisibility{ meta: &meta{ TypeID: 55} }
      if msg.hidden, err = ReadBoolean(reader); err != nil { return nil, err }
      return msg, nil
  
    case 56:
      msg := &PerformanceTrackAggr{ meta: &meta{ TypeID: 56} }
      if msg.TimestampStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.TimestampEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinFPS, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgFPS, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxFPS, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinCPU, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgCPU, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxCPU, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinTotalJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgTotalJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxTotalJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinUsedJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgUsedJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxUsedJSHeapSize, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 59:
      msg := &LongTask{ meta: &meta{ TypeID: 59} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
if msg.Context, err = ReadUint(reader); err != nil { return nil, err }
if msg.ContainerType, err = ReadUint(reader); err != nil { return nil, err }
if msg.ContainerSrc, err = ReadString(reader); err != nil { return nil, err }
if msg.ContainerId, err = ReadString(reader); err != nil { return nil, err }
if msg.ContainerName, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 60:
      msg := &SetNodeAttributeURLBased{ meta: &meta{ TypeID: 60} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
if msg.BaseURL, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 61:
      msg := &SetCSSDataURLBased{ meta: &meta{ TypeID: 61} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Data, err = ReadString(reader); err != nil { return nil, err }
if msg.BaseURL, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 62:
      msg := &IssueEvent{ meta: &meta{ TypeID: 62} }
      if msg.MessageID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Type, err = ReadString(reader); err != nil { return nil, err }
if msg.ContextString, err = ReadString(reader); err != nil { return nil, err }
if msg.Context, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 63:
      msg := &TechnicalInfo{ meta: &meta{ TypeID: 63} }
      if msg.Type, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 64:
      msg := &CustomIssue{ meta: &meta{ TypeID: 64} }
      if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 65:
      msg := &PageClose{ meta: &meta{ TypeID: 65} }
      
      return msg, nil
  
    case 66:
      msg := &AssetCache{ meta: &meta{ TypeID: 66} }
      if msg.URL, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 67:
      msg := &CSSInsertRuleURLBased{ meta: &meta{ TypeID: 67} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.Rule, err = ReadString(reader); err != nil { return nil, err }
if msg.Index, err = ReadUint(reader); err != nil { return nil, err }
if msg.BaseURL, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 69:
      msg := &MouseClick{ meta: &meta{ TypeID: 69} }
      if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
if msg.HesitationTime, err = ReadUint(reader); err != nil { return nil, err }
if msg.Label, err = ReadString(reader); err != nil { return nil, err }
if msg.Selector, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 70:
      msg := &CreateIFrameDocument{ meta: &meta{ TypeID: 70} }
      if msg.FrameID, err = ReadUint(reader); err != nil { return nil, err }
if msg.ID, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 107:
      msg := &IOSBatchMeta{ meta: &meta{ TypeID: 107} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.FirstIndex, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 90:
      msg := &IOSSessionStart{ meta: &meta{ TypeID: 90} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.ProjectID, err = ReadUint(reader); err != nil { return nil, err }
if msg.TrackerVersion, err = ReadString(reader); err != nil { return nil, err }
if msg.RevID, err = ReadString(reader); err != nil { return nil, err }
if msg.UserUUID, err = ReadString(reader); err != nil { return nil, err }
if msg.UserOS, err = ReadString(reader); err != nil { return nil, err }
if msg.UserOSVersion, err = ReadString(reader); err != nil { return nil, err }
if msg.UserDevice, err = ReadString(reader); err != nil { return nil, err }
if msg.UserDeviceType, err = ReadString(reader); err != nil { return nil, err }
if msg.UserCountry, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 91:
      msg := &IOSSessionEnd{ meta: &meta{ TypeID: 91} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 92:
      msg := &IOSMetadata{ meta: &meta{ TypeID: 92} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Key, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 93:
      msg := &IOSCustomEvent{ meta: &meta{ TypeID: 93} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 94:
      msg := &IOSUserID{ meta: &meta{ TypeID: 94} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 95:
      msg := &IOSUserAnonymousID{ meta: &meta{ TypeID: 95} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 96:
      msg := &IOSScreenChanges{ meta: &meta{ TypeID: 96} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.X, err = ReadUint(reader); err != nil { return nil, err }
if msg.Y, err = ReadUint(reader); err != nil { return nil, err }
if msg.Width, err = ReadUint(reader); err != nil { return nil, err }
if msg.Height, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 97:
      msg := &IOSCrash{ meta: &meta{ TypeID: 97} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Reason, err = ReadString(reader); err != nil { return nil, err }
if msg.Stacktrace, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 98:
      msg := &IOSScreenEnter{ meta: &meta{ TypeID: 98} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Title, err = ReadString(reader); err != nil { return nil, err }
if msg.ViewName, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 99:
      msg := &IOSScreenLeave{ meta: &meta{ TypeID: 99} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Title, err = ReadString(reader); err != nil { return nil, err }
if msg.ViewName, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 100:
      msg := &IOSClickEvent{ meta: &meta{ TypeID: 100} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Label, err = ReadString(reader); err != nil { return nil, err }
if msg.X, err = ReadUint(reader); err != nil { return nil, err }
if msg.Y, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 101:
      msg := &IOSInputEvent{ meta: &meta{ TypeID: 101} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Value, err = ReadString(reader); err != nil { return nil, err }
if msg.ValueMasked, err = ReadBoolean(reader); err != nil { return nil, err }
if msg.Label, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 102:
      msg := &IOSPerformanceEvent{ meta: &meta{ TypeID: 102} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Name, err = ReadString(reader); err != nil { return nil, err }
if msg.Value, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 103:
      msg := &IOSLog{ meta: &meta{ TypeID: 103} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Severity, err = ReadString(reader); err != nil { return nil, err }
if msg.Content, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 104:
      msg := &IOSInternalError{ meta: &meta{ TypeID: 104} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Content, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
    case 105:
      msg := &IOSNetworkCall{ meta: &meta{ TypeID: 105} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Length, err = ReadUint(reader); err != nil { return nil, err }
if msg.Duration, err = ReadUint(reader); err != nil { return nil, err }
if msg.Headers, err = ReadString(reader); err != nil { return nil, err }
if msg.Body, err = ReadString(reader); err != nil { return nil, err }
if msg.URL, err = ReadString(reader); err != nil { return nil, err }
if msg.Success, err = ReadBoolean(reader); err != nil { return nil, err }
if msg.Method, err = ReadString(reader); err != nil { return nil, err }
if msg.Status, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 110:
      msg := &IOSPerformanceAggregated{ meta: &meta{ TypeID: 110} }
      if msg.TimestampStart, err = ReadUint(reader); err != nil { return nil, err }
if msg.TimestampEnd, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinFPS, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgFPS, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxFPS, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinCPU, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgCPU, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxCPU, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinMemory, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgMemory, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxMemory, err = ReadUint(reader); err != nil { return nil, err }
if msg.MinBattery, err = ReadUint(reader); err != nil { return nil, err }
if msg.AvgBattery, err = ReadUint(reader); err != nil { return nil, err }
if msg.MaxBattery, err = ReadUint(reader); err != nil { return nil, err }
      return msg, nil
  
    case 111:
      msg := &IOSIssueEvent{ meta: &meta{ TypeID: 111} }
      if msg.Timestamp, err = ReadUint(reader); err != nil { return nil, err }
if msg.Type, err = ReadString(reader); err != nil { return nil, err }
if msg.ContextString, err = ReadString(reader); err != nil { return nil, err }
if msg.Context, err = ReadString(reader); err != nil { return nil, err }
if msg.Payload, err = ReadString(reader); err != nil { return nil, err }
      return msg, nil
  
  }
  return nil, fmt.Errorf("Unknown message code: %v", t)
}
