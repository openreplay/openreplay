// Auto-generated, do not edit
package messages

import (
	"fmt"
	"io"
)

func ReadMessage(reader io.Reader) (Message, error) {
	t, err := ReadUint(reader)
	if err != nil {
		return nil, err
	}
	switch t {

	case 80:
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
		return msg, nil

	case 0:
		msg := &Timestamp{}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 1:
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
		return msg, nil

	case 2:
		msg := &SessionDisconnect{}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 3:
		msg := &SessionEnd{}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 4:
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
		return msg, nil

	case 5:
		msg := &SetViewportSize{}
		if msg.Width, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Height, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 6:
		msg := &SetViewportScroll{}
		if msg.X, err = ReadInt(reader); err != nil {
			return nil, err
		}
		if msg.Y, err = ReadInt(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 7:
		msg := &CreateDocument{}

		return msg, nil

	case 8:
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
		return msg, nil

	case 9:
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
		return msg, nil

	case 10:
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
		return msg, nil

	case 11:
		msg := &RemoveNode{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 12:
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
		return msg, nil

	case 13:
		msg := &RemoveNodeAttribute{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Name, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 14:
		msg := &SetNodeData{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Data, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 15:
		msg := &SetCSSData{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Data, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 16:
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
		return msg, nil

	case 17:
		msg := &SetInputTarget{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Label, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 18:
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
		return msg, nil

	case 19:
		msg := &SetInputChecked{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Checked, err = ReadBoolean(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 20:
		msg := &MouseMove{}
		if msg.X, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Y, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 21:
		msg := &MouseClickDepricated{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.HesitationTime, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Label, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 22:
		msg := &ConsoleLog{}
		if msg.Level, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.Value, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 23:
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
		return msg, nil

	case 24:
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
		return msg, nil

	case 25:
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
		return msg, nil

	case 26:
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
		return msg, nil

	case 27:
		msg := &RawCustomEvent{}
		if msg.Name, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.Payload, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 28:
		msg := &UserID{}
		if msg.ID, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 29:
		msg := &UserAnonymousID{}
		if msg.ID, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 30:
		msg := &Metadata{}
		if msg.Key, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.Value, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 31:
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
		return msg, nil

	case 32:
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
		return msg, nil

	case 33:
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
		return msg, nil

	case 34:
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
		return msg, nil

	case 35:
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
		return msg, nil

	case 36:
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
		return msg, nil

	case 37:
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
		return msg, nil

	case 38:
		msg := &CSSDeleteRule{}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Index, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 39:
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
		return msg, nil

	case 40:
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
		return msg, nil

	case 41:
		msg := &OTable{}
		if msg.Key, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.Value, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 42:
		msg := &StateAction{}
		if msg.Type, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 43:
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
		return msg, nil

	case 44:
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
		return msg, nil

	case 45:
		msg := &Vuex{}
		if msg.Mutation, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.State, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 46:
		msg := &MobX{}
		if msg.Type, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.Payload, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 47:
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
		return msg, nil

	case 48:
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
		return msg, nil

	case 49:
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
		return msg, nil

	case 50:
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
		return msg, nil

	case 51:
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
		return msg, nil

	case 52:
		msg := &DOMDrop{}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 53:
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
		return msg, nil

	case 54:
		msg := &ConnectionInformation{}
		if msg.Downlink, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.Type, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 55:
		msg := &SetPageVisibility{}
		if msg.hidden, err = ReadBoolean(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 56:
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
		return msg, nil

	case 59:
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
		return msg, nil

	case 60:
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
		return msg, nil

	case 61:
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
		return msg, nil

	case 62:
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
		return msg, nil

	case 63:
		msg := &TechnicalInfo{}
		if msg.Type, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.Value, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 64:
		msg := &CustomIssue{}
		if msg.Name, err = ReadString(reader); err != nil {
			return nil, err
		}
		if msg.Payload, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 65:
		msg := &PageClose{}

		return msg, nil

	case 66:
		msg := &AssetCache{}
		if msg.URL, err = ReadString(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 67:
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
		return msg, nil

	case 69:
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
		return msg, nil

	case 70:
		msg := &CreateIFrameDocument{}
		if msg.FrameID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		if msg.ID, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 107:
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
		return msg, nil

	case 90:
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
		return msg, nil

	case 91:
		msg := &IOSSessionEnd{}
		if msg.Timestamp, err = ReadUint(reader); err != nil {
			return nil, err
		}
		return msg, nil

	case 92:
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
		return msg, nil

	case 93:
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
		return msg, nil

	case 94:
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
		return msg, nil

	case 95:
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
		return msg, nil

	case 96:
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
		return msg, nil

	case 97:
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
		return msg, nil

	case 98:
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
		return msg, nil

	case 99:
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
		return msg, nil

	case 100:
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
		return msg, nil

	case 101:
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
		return msg, nil

	case 102:
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
		return msg, nil

	case 103:
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
		return msg, nil

	case 104:
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
		return msg, nil

	case 105:
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
		return msg, nil

	case 110:
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
		return msg, nil

	case 111:
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
		return msg, nil

	}
	return nil, fmt.Errorf("Unknown message code: %v", t)
}
