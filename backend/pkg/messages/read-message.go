// Auto-generated, do not edit
package messages

import (
	"fmt"
)

func DecodeTimestamp(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &Timestamp{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSessionStart(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SessionStart{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ProjectID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TrackerVersion, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.RevID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserUUID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserAgent, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserOS, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserOSVersion, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserBrowser, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserBrowserVersion, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserDevice, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserDeviceType, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserDeviceMemorySize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.UserDeviceHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.UserCountry, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSessionEndDeprecated(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SessionEndDeprecated{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetPageLocation(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetPageLocation{}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Referrer, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.NavigationStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetViewportSize(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetViewportSize{}
	if msg.Width, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Height, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetViewportScroll(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetViewportScroll{}
	if msg.X, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	if msg.Y, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCreateDocument(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CreateDocument{}

	return msg, err
}

func DecodeCreateElementNode(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CreateElementNode{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ParentID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Tag, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.SVG, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCreateTextNode(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CreateTextNode{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ParentID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeMoveNode(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &MoveNode{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ParentID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeRemoveNode(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &RemoveNode{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetNodeAttribute(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetNodeAttribute{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeRemoveNodeAttribute(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &RemoveNodeAttribute{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetNodeData(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetNodeData{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Data, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetCSSData(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetCSSData{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Data, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetNodeScroll(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetNodeScroll{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.X, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	if msg.Y, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetInputTarget(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetInputTarget{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Label, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetInputValue(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetInputValue{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Mask, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetInputChecked(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetInputChecked{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Checked, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeMouseMove(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &MouseMove{}
	if msg.X, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Y, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeNetworkRequestDeprecated(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &NetworkRequestDeprecated{}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Method, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Request, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Response, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Status, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeConsoleLog(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &ConsoleLog{}
	if msg.Level, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodePageLoadTiming(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &PageLoadTiming{}
	if msg.RequestStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ResponseStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ResponseEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.DomContentLoadedEventStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.DomContentLoadedEventEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.LoadEventStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.LoadEventEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.FirstPaint, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.FirstContentfulPaint, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodePageRenderTiming(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &PageRenderTiming{}
	if msg.SpeedIndex, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.VisuallyComplete, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TimeToInteractive, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeJSExceptionDeprecated(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &JSExceptionDeprecated{}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Message, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIntegrationEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IntegrationEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Source, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Message, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCustomEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CustomEvent{}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeUserID(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &UserID{}
	if msg.ID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeUserAnonymousID(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &UserAnonymousID{}
	if msg.ID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeMetadata(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &Metadata{}
	if msg.Key, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodePageEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &PageEvent{}
	if msg.MessageID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Referrer, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Loaded, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	if msg.RequestStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ResponseStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ResponseEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.DomContentLoadedEventStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.DomContentLoadedEventEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.LoadEventStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.LoadEventEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.FirstPaint, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.FirstContentfulPaint, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.SpeedIndex, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.VisuallyComplete, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TimeToInteractive, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeInputEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &InputEvent{}
	if msg.MessageID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ValueMasked, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	if msg.Label, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCSSInsertRule(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CSSInsertRule{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Rule, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCSSDeleteRule(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CSSDeleteRule{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeFetch(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &Fetch{}
	if msg.Method, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Request, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Response, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Status, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeProfiler(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &Profiler{}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Args, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Result, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeOTable(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &OTable{}
	if msg.Key, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeStateAction(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &StateAction{}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeRedux(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &Redux{}
	if msg.Action, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.State, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeVuex(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &Vuex{}
	if msg.Mutation, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.State, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeMobX(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &MobX{}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeNgRx(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &NgRx{}
	if msg.Action, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.State, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeGraphQL(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &GraphQL{}
	if msg.OperationKind, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.OperationName, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Variables, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Response, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodePerformanceTrack(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &PerformanceTrack{}
	if msg.Frames, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	if msg.Ticks, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	if msg.TotalJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.UsedJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeStringDict(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &StringDict{}
	if msg.Key, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetNodeAttributeDict(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetNodeAttributeDict{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.NameKey, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ValueKey, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeResourceTimingDeprecated(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &ResourceTimingDeprecated{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TTFB, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.HeaderSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.EncodedBodySize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.DecodedBodySize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Initiator, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeConnectionInformation(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &ConnectionInformation{}
	if msg.Downlink, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetPageVisibility(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetPageVisibility{}
	if msg.hidden, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodePerformanceTrackAggr(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &PerformanceTrackAggr{}
	if msg.TimestampStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TimestampEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinFPS, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgFPS, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxFPS, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinCPU, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgCPU, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxCPU, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinTotalJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgTotalJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxTotalJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinUsedJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgUsedJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxUsedJSHeapSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeLoadFontFace(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &LoadFontFace{}
	if msg.ParentID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Family, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Source, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Descriptors, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetNodeFocus(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetNodeFocus{}
	if msg.ID, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeLongTask(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &LongTask{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Context, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ContainerType, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ContainerSrc, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ContainerId, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ContainerName, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetNodeAttributeURLBased(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetNodeAttributeURLBased{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.BaseURL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSetCSSDataURLBased(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SetCSSDataURLBased{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Data, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.BaseURL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIssueEventDeprecated(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IssueEventDeprecated{}
	if msg.MessageID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ContextString, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Context, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeTechnicalInfo(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &TechnicalInfo{}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCustomIssue(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CustomIssue{}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAssetCache(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AssetCache{}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCSSInsertRuleURLBased(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CSSInsertRuleURLBased{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Rule, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.BaseURL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeMouseClick(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &MouseClick{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.HesitationTime, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Label, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Selector, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCreateIFrameDocument(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CreateIFrameDocument{}
	if msg.FrameID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAdoptedSSReplaceURLBased(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AdoptedSSReplaceURLBased{}
	if msg.SheetID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Text, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.BaseURL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAdoptedSSReplace(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AdoptedSSReplace{}
	if msg.SheetID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Text, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAdoptedSSInsertRuleURLBased(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AdoptedSSInsertRuleURLBased{}
	if msg.SheetID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Rule, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.BaseURL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAdoptedSSInsertRule(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AdoptedSSInsertRule{}
	if msg.SheetID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Rule, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAdoptedSSDeleteRule(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AdoptedSSDeleteRule{}
	if msg.SheetID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Index, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAdoptedSSAddOwner(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AdoptedSSAddOwner{}
	if msg.SheetID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeAdoptedSSRemoveOwner(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &AdoptedSSRemoveOwner{}
	if msg.SheetID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeJSException(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &JSException{}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Message, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Metadata, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeZustand(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &Zustand{}
	if msg.Mutation, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.State, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeBatchMeta(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &BatchMeta{}
	if msg.PageNo, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.FirstIndex, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeBatchMetadata(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &BatchMetadata{}
	if msg.Version, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.PageNo, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.FirstIndex, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	if msg.Location, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodePartitionedMessage(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &PartitionedMessage{}
	if msg.PartNo, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.PartTotal, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeNetworkRequest(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &NetworkRequest{}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Method, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Request, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Response, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Status, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TransferredBodySize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeWSChannel(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &WSChannel{}
	if msg.ChType, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ChannelName, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Data, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Dir, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.MessageType, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeInputChange(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &InputChange{}
	if msg.ID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ValueMasked, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	if msg.Label, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.HesitationTime, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	if msg.InputDuration, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSelectionChange(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SelectionChange{}
	if msg.SelectionStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.SelectionEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Selection, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeMouseThrashing(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &MouseThrashing{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeUnbindNodes(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &UnbindNodes{}
	if msg.TotalRemovedPercent, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeResourceTiming(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &ResourceTiming{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TTFB, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.HeaderSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.EncodedBodySize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.DecodedBodySize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Initiator, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.TransferredSize, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Cached, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeTabChange(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &TabChange{}
	if msg.TabId, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeTabData(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &TabData{}
	if msg.TabId, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeCanvasNode(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &CanvasNode{}
	if msg.NodeId, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeTagTrigger(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &TagTrigger{}
	if msg.TagId, err = reader.ReadInt(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIssueEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IssueEvent{}
	if msg.MessageID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ContextString, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Context, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSessionEnd(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SessionEnd{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.EncryptionKey, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSessionSearch(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &SessionSearch{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Partition, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSSessionStart(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSSessionStart{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ProjectID, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TrackerVersion, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.RevID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserUUID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserOS, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserOSVersion, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserDevice, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserDeviceType, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.UserCountry, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSSessionEnd(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSSessionEnd{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSMetadata(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSMetadata{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Key, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSUserID(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSUserID{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSUserAnonymousID(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSUserAnonymousID{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ID, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSScreenChanges(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSScreenChanges{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.X, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Y, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Width, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Height, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSCrash(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSCrash{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Reason, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Stacktrace, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSViewComponentEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSViewComponentEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.ScreenName, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ViewName, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Visible, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSClickEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSClickEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Label, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.X, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Y, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSInputEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSInputEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ValueMasked, err = reader.ReadBoolean(); err != nil {
		return nil, err
	}
	if msg.Label, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSPerformanceEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSPerformanceEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Name, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Value, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSLog(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSLog{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Severity, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Content, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSInternalError(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSInternalError{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Content, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSNetworkCall(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSNetworkCall{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Method, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.URL, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Request, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Response, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Status, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Duration, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSSwipeEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSSwipeEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Label, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.X, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Y, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Direction, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSBatchMeta(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSBatchMeta{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Length, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.FirstIndex, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSPerformanceAggregated(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSPerformanceAggregated{}
	if msg.TimestampStart, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.TimestampEnd, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinFPS, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgFPS, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxFPS, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinCPU, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgCPU, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxCPU, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinMemory, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgMemory, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxMemory, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MinBattery, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.AvgBattery, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.MaxBattery, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSIssueEvent(reader BytesReader) (Message, error) {
	var err error = nil
	msg := &IOSIssueEvent{}
	if msg.Timestamp, err = reader.ReadUint(); err != nil {
		return nil, err
	}
	if msg.Type, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.ContextString, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Context, err = reader.ReadString(); err != nil {
		return nil, err
	}
	if msg.Payload, err = reader.ReadString(); err != nil {
		return nil, err
	}
	return msg, err
}

func ReadMessage(t uint64, reader BytesReader) (Message, error) {
	switch t {
	case 0:
		return DecodeTimestamp(reader)
	case 1:
		return DecodeSessionStart(reader)
	case 3:
		return DecodeSessionEndDeprecated(reader)
	case 4:
		return DecodeSetPageLocation(reader)
	case 5:
		return DecodeSetViewportSize(reader)
	case 6:
		return DecodeSetViewportScroll(reader)
	case 7:
		return DecodeCreateDocument(reader)
	case 8:
		return DecodeCreateElementNode(reader)
	case 9:
		return DecodeCreateTextNode(reader)
	case 10:
		return DecodeMoveNode(reader)
	case 11:
		return DecodeRemoveNode(reader)
	case 12:
		return DecodeSetNodeAttribute(reader)
	case 13:
		return DecodeRemoveNodeAttribute(reader)
	case 14:
		return DecodeSetNodeData(reader)
	case 15:
		return DecodeSetCSSData(reader)
	case 16:
		return DecodeSetNodeScroll(reader)
	case 17:
		return DecodeSetInputTarget(reader)
	case 18:
		return DecodeSetInputValue(reader)
	case 19:
		return DecodeSetInputChecked(reader)
	case 20:
		return DecodeMouseMove(reader)
	case 21:
		return DecodeNetworkRequestDeprecated(reader)
	case 22:
		return DecodeConsoleLog(reader)
	case 23:
		return DecodePageLoadTiming(reader)
	case 24:
		return DecodePageRenderTiming(reader)
	case 25:
		return DecodeJSExceptionDeprecated(reader)
	case 26:
		return DecodeIntegrationEvent(reader)
	case 27:
		return DecodeCustomEvent(reader)
	case 28:
		return DecodeUserID(reader)
	case 29:
		return DecodeUserAnonymousID(reader)
	case 30:
		return DecodeMetadata(reader)
	case 31:
		return DecodePageEvent(reader)
	case 32:
		return DecodeInputEvent(reader)
	case 37:
		return DecodeCSSInsertRule(reader)
	case 38:
		return DecodeCSSDeleteRule(reader)
	case 39:
		return DecodeFetch(reader)
	case 40:
		return DecodeProfiler(reader)
	case 41:
		return DecodeOTable(reader)
	case 42:
		return DecodeStateAction(reader)
	case 44:
		return DecodeRedux(reader)
	case 45:
		return DecodeVuex(reader)
	case 46:
		return DecodeMobX(reader)
	case 47:
		return DecodeNgRx(reader)
	case 48:
		return DecodeGraphQL(reader)
	case 49:
		return DecodePerformanceTrack(reader)
	case 50:
		return DecodeStringDict(reader)
	case 51:
		return DecodeSetNodeAttributeDict(reader)
	case 53:
		return DecodeResourceTimingDeprecated(reader)
	case 54:
		return DecodeConnectionInformation(reader)
	case 55:
		return DecodeSetPageVisibility(reader)
	case 56:
		return DecodePerformanceTrackAggr(reader)
	case 57:
		return DecodeLoadFontFace(reader)
	case 58:
		return DecodeSetNodeFocus(reader)
	case 59:
		return DecodeLongTask(reader)
	case 60:
		return DecodeSetNodeAttributeURLBased(reader)
	case 61:
		return DecodeSetCSSDataURLBased(reader)
	case 62:
		return DecodeIssueEventDeprecated(reader)
	case 63:
		return DecodeTechnicalInfo(reader)
	case 64:
		return DecodeCustomIssue(reader)
	case 66:
		return DecodeAssetCache(reader)
	case 67:
		return DecodeCSSInsertRuleURLBased(reader)
	case 69:
		return DecodeMouseClick(reader)
	case 70:
		return DecodeCreateIFrameDocument(reader)
	case 71:
		return DecodeAdoptedSSReplaceURLBased(reader)
	case 72:
		return DecodeAdoptedSSReplace(reader)
	case 73:
		return DecodeAdoptedSSInsertRuleURLBased(reader)
	case 74:
		return DecodeAdoptedSSInsertRule(reader)
	case 75:
		return DecodeAdoptedSSDeleteRule(reader)
	case 76:
		return DecodeAdoptedSSAddOwner(reader)
	case 77:
		return DecodeAdoptedSSRemoveOwner(reader)
	case 78:
		return DecodeJSException(reader)
	case 79:
		return DecodeZustand(reader)
	case 80:
		return DecodeBatchMeta(reader)
	case 81:
		return DecodeBatchMetadata(reader)
	case 82:
		return DecodePartitionedMessage(reader)
	case 83:
		return DecodeNetworkRequest(reader)
	case 84:
		return DecodeWSChannel(reader)
	case 112:
		return DecodeInputChange(reader)
	case 113:
		return DecodeSelectionChange(reader)
	case 114:
		return DecodeMouseThrashing(reader)
	case 115:
		return DecodeUnbindNodes(reader)
	case 116:
		return DecodeResourceTiming(reader)
	case 117:
		return DecodeTabChange(reader)
	case 118:
		return DecodeTabData(reader)
	case 119:
		return DecodeCanvasNode(reader)
	case 120:
		return DecodeTagTrigger(reader)
	case 125:
		return DecodeIssueEvent(reader)
	case 126:
		return DecodeSessionEnd(reader)
	case 127:
		return DecodeSessionSearch(reader)
	case 90:
		return DecodeIOSSessionStart(reader)
	case 91:
		return DecodeIOSSessionEnd(reader)
	case 92:
		return DecodeIOSMetadata(reader)
	case 93:
		return DecodeIOSEvent(reader)
	case 94:
		return DecodeIOSUserID(reader)
	case 95:
		return DecodeIOSUserAnonymousID(reader)
	case 96:
		return DecodeIOSScreenChanges(reader)
	case 97:
		return DecodeIOSCrash(reader)
	case 98:
		return DecodeIOSViewComponentEvent(reader)
	case 100:
		return DecodeIOSClickEvent(reader)
	case 101:
		return DecodeIOSInputEvent(reader)
	case 102:
		return DecodeIOSPerformanceEvent(reader)
	case 103:
		return DecodeIOSLog(reader)
	case 104:
		return DecodeIOSInternalError(reader)
	case 105:
		return DecodeIOSNetworkCall(reader)
	case 106:
		return DecodeIOSSwipeEvent(reader)
	case 107:
		return DecodeIOSBatchMeta(reader)
	case 110:
		return DecodeIOSPerformanceAggregated(reader)
	case 111:
		return DecodeIOSIssueEvent(reader)
	}
	return nil, fmt.Errorf("Unknown message code: %v", t)
}
