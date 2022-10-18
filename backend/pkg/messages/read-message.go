// Auto-generated, do not edit
package messages

import (
	"fmt"
	"io"
)


func DecodeBatchMeta(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &BatchMeta{}
    		if msg.PageNo, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.FirstIndex, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeBatchMetadata(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &BatchMetadata{}
    		if msg.Version, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.PageNo, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.FirstIndex, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
		if msg.Location, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodePartitionedMessage(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &PartitionedMessage{}
    		if msg.PartNo, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.PartTotal, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeTimestamp(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &Timestamp{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSessionStart(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SessionStart{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ProjectID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TrackerVersion, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.RevID, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserUUID, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserAgent, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserOS, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserOSVersion, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserBrowser, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserBrowserVersion, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserDevice, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserDeviceType, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserDeviceMemorySize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.UserDeviceHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.UserCountry, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserID, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSessionEnd(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SessionEnd{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.EncryptionKey, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetPageLocation(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetPageLocation{}
    		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Referrer, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.NavigationStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetViewportSize(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetViewportSize{}
    		if msg.Width, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Height, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetViewportScroll(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetViewportScroll{}
    		if msg.X, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
		if msg.Y, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCreateDocument(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CreateDocument{}
    
    		return msg, err
}


func DecodeCreateElementNode(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CreateElementNode{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ParentID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Tag, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.SVG, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCreateTextNode(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CreateTextNode{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ParentID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeMoveNode(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &MoveNode{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ParentID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeRemoveNode(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &RemoveNode{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetNodeAttribute(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetNodeAttribute{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeRemoveNodeAttribute(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &RemoveNodeAttribute{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetNodeData(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetNodeData{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Data, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetCSSData(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetCSSData{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Data, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetNodeScroll(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetNodeScroll{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.X, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
		if msg.Y, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetInputTarget(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetInputTarget{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Label, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetInputValue(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetInputValue{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Mask, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetInputChecked(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetInputChecked{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Checked, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeMouseMove(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &MouseMove{}
    		if msg.X, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Y, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeConsoleLog(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &ConsoleLog{}
    		if msg.Level, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodePageLoadTiming(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &PageLoadTiming{}
    		if msg.RequestStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ResponseStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ResponseEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.DomContentLoadedEventStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.DomContentLoadedEventEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.LoadEventStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.LoadEventEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.FirstPaint, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.FirstContentfulPaint, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodePageRenderTiming(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &PageRenderTiming{}
    		if msg.SpeedIndex, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.VisuallyComplete, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TimeToInteractive, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}

func DecodeJSExceptionDeprecated(reader io.Reader) (Message, error) {
	var err error = nil
	msg := &JSExceptionDeprecated{}
	if msg.Name, err = ReadString(reader); err != nil {
		return nil, err
	}
	if msg.Message, err = ReadString(reader); err != nil {
		return nil, err
	}
	if msg.Payload, err = ReadString(reader); err != nil {
		return nil, err
	}
	return msg, err
}


func DecodeIntegrationEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IntegrationEvent{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Source, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Message, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeRawCustomEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &RawCustomEvent{}
    		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeUserID(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &UserID{}
    		if msg.ID, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeUserAnonymousID(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &UserAnonymousID{}
    		if msg.ID, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeMetadata(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &Metadata{}
    		if msg.Key, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodePageEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &PageEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Referrer, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Loaded, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
		if msg.RequestStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ResponseStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ResponseEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.DomContentLoadedEventStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.DomContentLoadedEventEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.LoadEventStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.LoadEventEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.FirstPaint, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.FirstContentfulPaint, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.SpeedIndex, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.VisuallyComplete, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TimeToInteractive, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeInputEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &InputEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ValueMasked, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
		if msg.Label, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeClickEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &ClickEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.HesitationTime, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Label, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Selector, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeErrorEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &ErrorEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Source, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Message, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeResourceEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &ResourceEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TTFB, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.HeaderSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.EncodedBodySize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.DecodedBodySize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Success, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
		if msg.Method, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Status, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCustomEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CustomEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCSSInsertRule(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CSSInsertRule{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Rule, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCSSDeleteRule(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CSSDeleteRule{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeFetch(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &Fetch{}
    		if msg.Method, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Request, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Response, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Status, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeProfiler(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &Profiler{}
    		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Args, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Result, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeOTable(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &OTable{}
    		if msg.Key, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeStateAction(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &StateAction{}
    		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeStateActionEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &StateActionEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeRedux(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &Redux{}
    		if msg.Action, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.State, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeVuex(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &Vuex{}
    		if msg.Mutation, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.State, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeMobX(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &MobX{}
    		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeNgRx(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &NgRx{}
    		if msg.Action, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.State, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeGraphQL(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &GraphQL{}
    		if msg.OperationKind, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.OperationName, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Variables, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Response, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodePerformanceTrack(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &PerformanceTrack{}
    		if msg.Frames, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
		if msg.Ticks, err = ReadInt(reader); err != nil {
    			return nil, err
    		}
		if msg.TotalJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.UsedJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeGraphQLEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &GraphQLEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.OperationKind, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.OperationName, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Variables, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Response, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeFetchEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &FetchEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Method, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Request, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Response, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Status, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeDOMDrop(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &DOMDrop{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeResourceTiming(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &ResourceTiming{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TTFB, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.HeaderSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.EncodedBodySize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.DecodedBodySize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Initiator, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeConnectionInformation(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &ConnectionInformation{}
    		if msg.Downlink, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetPageVisibility(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetPageVisibility{}
    		if msg.hidden, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodePerformanceTrackAggr(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &PerformanceTrackAggr{}
    		if msg.TimestampStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TimestampEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinFPS, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgFPS, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxFPS, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinCPU, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgCPU, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxCPU, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinTotalJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgTotalJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxTotalJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinUsedJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgUsedJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxUsedJSHeapSize, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeLongTask(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &LongTask{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Context, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ContainerType, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ContainerSrc, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ContainerId, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ContainerName, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetNodeAttributeURLBased(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetNodeAttributeURLBased{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.BaseURL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeSetCSSDataURLBased(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &SetCSSDataURLBased{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Data, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.BaseURL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIssueEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IssueEvent{}
    		if msg.MessageID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ContextString, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Context, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeTechnicalInfo(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &TechnicalInfo{}
    		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCustomIssue(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CustomIssue{}
    		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAssetCache(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AssetCache{}
    		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCSSInsertRuleURLBased(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CSSInsertRuleURLBased{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Rule, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.BaseURL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeMouseClick(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &MouseClick{}
    		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.HesitationTime, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Label, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Selector, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeCreateIFrameDocument(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &CreateIFrameDocument{}
    		if msg.FrameID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAdoptedSSReplaceURLBased(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AdoptedSSReplaceURLBased{}
    		if msg.SheetID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Text, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.BaseURL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAdoptedSSReplace(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AdoptedSSReplace{}
    		if msg.SheetID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Text, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAdoptedSSInsertRuleURLBased(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AdoptedSSInsertRuleURLBased{}
    		if msg.SheetID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Rule, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.BaseURL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAdoptedSSInsertRule(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AdoptedSSInsertRule{}
    		if msg.SheetID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Rule, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAdoptedSSDeleteRule(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AdoptedSSDeleteRule{}
    		if msg.SheetID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Index, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAdoptedSSAddOwner(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AdoptedSSAddOwner{}
    		if msg.SheetID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeAdoptedSSRemoveOwner(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &AdoptedSSRemoveOwner{}
    		if msg.SheetID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeZustand(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &Zustand{}
    		if msg.Mutation, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.State, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}

func DecodeJSException(reader io.Reader) (Message, error) {
	var err error = nil
	msg := &JSException{}
	if msg.Name, err = ReadString(reader); err != nil {
		return nil, err
	}
	if msg.Message, err = ReadString(reader); err != nil {
		return nil, err
	}
	if msg.Payload, err = ReadString(reader); err != nil {
		return nil, err
	}
	if msg.Metadata, err = ReadString(reader); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeSessionSearch(reader io.Reader) (Message, error) {
	var err error = nil
	msg := &SessionSearch{}
	if msg.Timestamp, err = ReadUint(reader); err != nil {
		return nil, err
	}
	if msg.Partition, err = ReadUint(reader); err != nil {
		return nil, err
	}
	return msg, err
}

func DecodeIOSBatchMeta(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSBatchMeta{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.FirstIndex, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSSessionStart(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSSessionStart{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.ProjectID, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TrackerVersion, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.RevID, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserUUID, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserOS, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserOSVersion, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserDevice, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserDeviceType, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.UserCountry, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSSessionEnd(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSSessionEnd{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSMetadata(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSMetadata{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Key, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSCustomEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSCustomEvent{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSUserID(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSUserID{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSUserAnonymousID(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSUserAnonymousID{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSScreenChanges(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSScreenChanges{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.X, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Y, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Width, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Height, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSCrash(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSCrash{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Reason, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Stacktrace, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSScreenEnter(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSScreenEnter{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Title, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ViewName, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSScreenLeave(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSScreenLeave{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Title, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ViewName, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSClickEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSClickEvent{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Label, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.X, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Y, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSInputEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSInputEvent{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ValueMasked, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
		if msg.Label, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSPerformanceEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSPerformanceEvent{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Name, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Value, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSLog(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSLog{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Severity, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Content, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSInternalError(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSInternalError{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Content, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSNetworkCall(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSNetworkCall{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Length, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Duration, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Headers, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Body, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.URL, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Success, err = ReadBoolean(reader); err != nil {
    			return nil, err
    		}
		if msg.Method, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Status, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSPerformanceAggregated(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSPerformanceAggregated{}
    		if msg.TimestampStart, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.TimestampEnd, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinFPS, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgFPS, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxFPS, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinCPU, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgCPU, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxCPU, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinMemory, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgMemory, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxMemory, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MinBattery, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.AvgBattery, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.MaxBattery, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}


func DecodeIOSIssueEvent(reader io.Reader) (Message, error) {
    var err error = nil
    msg := &IOSIssueEvent{}
    		if msg.Timestamp, err = ReadUint(reader); err != nil {
    			return nil, err
    		}
		if msg.Type, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.ContextString, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Context, err = ReadString(reader); err != nil {
    			return nil, err
    		}
		if msg.Payload, err = ReadString(reader); err != nil {
    			return nil, err
    		}
    		return msg, err
}



func ReadMessage(t uint64, reader io.Reader) (Message, error) {
	switch t {

	case 80:
		return DecodeBatchMeta(reader)

	case 81:
		return DecodeBatchMetadata(reader)

	case 82:
		return DecodePartitionedMessage(reader)

	case 0:
		return DecodeTimestamp(reader)

	case 1:
		return DecodeSessionStart(reader)

	case 3:
		return DecodeSessionEnd(reader)

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
		return DecodeRawCustomEvent(reader)

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

	case 33:
		return DecodeClickEvent(reader)

	case 34:
		return DecodeErrorEvent(reader)

	case 35:
		return DecodeResourceEvent(reader)

	case 36:
		return DecodeCustomEvent(reader)

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

	case 43:
		return DecodeStateActionEvent(reader)

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
		return DecodeGraphQLEvent(reader)

	case 51:
		return DecodeFetchEvent(reader)

	case 52:
		return DecodeDOMDrop(reader)

	case 53:
		return DecodeResourceTiming(reader)

	case 54:
		return DecodeConnectionInformation(reader)

	case 55:
		return DecodeSetPageVisibility(reader)

	case 56:
		return DecodePerformanceTrackAggr(reader)

	case 59:
		return DecodeLongTask(reader)

	case 60:
		return DecodeSetNodeAttributeURLBased(reader)

	case 61:
		return DecodeSetCSSDataURLBased(reader)

	case 62:
		return DecodeIssueEvent(reader)

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

	case 79:
		return DecodeZustand(reader)

	case 78:
		return DecodeJSException(reader)

	case 127:
		return DecodeSessionSearch(reader)

	case 107:
		return DecodeIOSBatchMeta(reader)

	case 90:
		return DecodeIOSSessionStart(reader)

	case 91:
		return DecodeIOSSessionEnd(reader)

	case 92:
		return DecodeIOSMetadata(reader)

	case 93:
		return DecodeIOSCustomEvent(reader)

	case 94:
		return DecodeIOSUserID(reader)

	case 95:
		return DecodeIOSUserAnonymousID(reader)

	case 96:
		return DecodeIOSScreenChanges(reader)

	case 97:
		return DecodeIOSCrash(reader)

	case 98:
		return DecodeIOSScreenEnter(reader)

	case 99:
		return DecodeIOSScreenLeave(reader)

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

	case 110:
		return DecodeIOSPerformanceAggregated(reader)

	case 111:
		return DecodeIOSIssueEvent(reader)

	}
	return nil, fmt.Errorf("Unknown message code: %v", t)
}
